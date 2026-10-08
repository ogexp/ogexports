<?php

namespace App\Support;

use App\Models\Investment;
use App\Models\InvestmentProject;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WalletInvestmentService
{
    /**
     * Auto-approve a wallet-funded investment: deduct user wallet, credit platform wallet, activate investment.
     *
     * `$amount` is denominated in the project's currency; the locked wallet debit
     * conversion records the actual amount and currency removed from the wallet.
     *
     * @return array{investment: Investment, capacity: array<string, mixed>, wallet_debit: float, wallet_currency: string, wallet_exchange_rate: float, wallet_rates_as_of: string|null, investment_amount_usd: float}
     */
    public function investFromWallet(User $user, InvestmentProject $project, float $amount): array
    {
        return DB::transaction(function () use ($user, $project, $amount) {
            $project = InvestmentProject::query()
                ->whereKey($project->id)
                ->whereIn('status', ContainerProjectStatus::investableStatuses())
                ->lockForUpdate()
                ->firstOrFail();

            if ($amount <= 0) {
                throw ValidationException::withMessages([
                    'amount' => ['Amount must be greater than zero.'],
                ]);
            }

            if ($project->min_investment && $amount < (float) $project->min_investment) {
                throw ValidationException::withMessages([
                    'amount' => ['Amount is below minimum investment.'],
                ]);
            }

            if ($project->max_investment && $amount > (float) $project->max_investment) {
                throw ValidationException::withMessages([
                    'amount' => ['Amount exceeds maximum investment.'],
                ]);
            }

            $capacity = InvestmentCapacity::snapshot($project);
            if ($capacity['is_full'] || $amount > $capacity['remaining_capacity'] + 0.0001) {
                throw ValidationException::withMessages([
                    'amount' => ['Investment capacity reached. Remaining: '.$capacity['remaining_capacity']],
                ]);
            }

            $walletCurrency = strtoupper((string) UserDisplayCurrency::currencyForUser($user));
            $investmentCurrency = strtolower((string) $project->type) === 'container'
                ? 'USD'
                : strtoupper((string) ($project->currency ?: 'USD'));
            $conversion = ExchangeRateService::convert($amount, $investmentCurrency, $walletCurrency);
            $investmentAmountUsd = ExchangeRateService::convert($amount, $investmentCurrency, 'USD')['amount'];
            $walletDebit = $conversion['amount'];
            $amountPkr = $walletCurrency === 'PKR' && $investmentCurrency === 'USD'
                ? $walletDebit
                : null;
            $exchangeRate = $amountPkr !== null ? $conversion['rate'] : null;

            $wallet = Wallet::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (! $wallet) {
                $wallet = Wallet::query()->create([
                    'user_id' => $user->id,
                    'currency' => $walletCurrency,
                    'available_balance' => 0,
                    'pending_balance' => 0,
                ]);
                $wallet = Wallet::query()->whereKey($wallet->id)->lockForUpdate()->firstOrFail();
            }

            $available = (float) $wallet->available_balance;

            if ($walletDebit > $available + 0.0001) {
                throw ValidationException::withMessages([
                    'amount' => ['Insufficient wallet balance. Available: '.number_format($available, 2, '.', '').' '.$walletCurrency],
                ]);
            }

            PlatformWalletService::ensure($walletCurrency);

            $investment = Investment::query()->create([
                'project_id' => $project->id,
                'investor_id' => $user->id,
                'amount' => $amount,
                'amount_pkr' => $amountPkr,
                'exchange_rate' => $exchangeRate,
                'amount_currency' => $investmentCurrency,
                'status' => 'active',
                'payment_source' => InvestmentPaymentSource::WALLET,
                'invested_at' => now(),
                'approved_at' => now(),
            ]);

            $investment->setRelation('project', $project);
            $investment = InvestmentReferenceGenerator::assign($investment);
            $reference = (string) $investment->reference;

            $wallet->decrement('available_balance', $walletDebit);

            $walletTx = WalletTransaction::query()->create([
                'wallet_id' => $wallet->id,
                'type' => 'investment',
                'amount' => $walletDebit,
                'direction' => 'debit',
                'reference' => $reference,
                'status' => 'completed',
                'meta' => [
                    'investment_id' => $investment->id,
                    'project_id' => $project->id,
                    'auto_approved' => true,
                    'amount_usd' => $investmentAmountUsd,
                    'amount_pkr' => $amountPkr,
                    'exchange_rate' => $exchangeRate,
                    'currency' => $walletCurrency,
                    'wallet_amount' => $walletDebit,
                    'investment_currency' => $investmentCurrency,
                    'wallet_exchange_rate' => $conversion['rate'],
                    'wallet_rates_as_of' => $conversion['as_of'],
                ],
            ]);

            PlatformWalletService::credit(
                $walletDebit,
                'investment_in',
                $reference,
                [
                    'investment_id' => $investment->id,
                    'project_id' => $project->id,
                    'investor_id' => $user->id,
                    'wallet_transaction_id' => $walletTx->id,
                    'amount_usd' => $investmentAmountUsd,
                    'amount_pkr' => $amountPkr,
                    'exchange_rate' => $exchangeRate,
                ],
                $walletCurrency,
            );

            InvestmentActivation::applyToProject($project, $investment);

            $freshCapacity = InvestmentCapacity::snapshot($project->fresh());

            return [
                'investment' => $investment->fresh()->load('project'),
                'capacity' => $freshCapacity,
                'wallet_debit' => $walletDebit,
                'wallet_currency' => $walletCurrency,
                'wallet_exchange_rate' => $conversion['rate'],
                'wallet_rates_as_of' => $conversion['as_of'],
                'investment_amount_usd' => $investmentAmountUsd,
            ];
        });
    }
}
