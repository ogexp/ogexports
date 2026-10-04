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
     * For Pakistani PKR-wallet investors funding container projects, `$amount` is USD
     * (capacity / project currency). Wallet debit uses the locked PKR conversion.
     *
     * @return array{investment: Investment, capacity: array<string, mixed>}
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

            $walletCurrency = InvestorMarket::currencyForUser($user);
            $isPkrContainer = UserDisplayCurrency::isPkrUser($user)
                && strtolower((string) $project->type) === 'container';

            $amountPkr = null;
            $exchangeRate = null;
            $amountCurrency = $walletCurrency;
            $walletDebit = $amount;

            if ($isPkrContainer) {
                $conversion = ExchangeRateService::convert($amount, 'USD', 'PKR');
                $amountPkr = $conversion['amount'];
                $exchangeRate = $conversion['rate'];
                $amountCurrency = 'USD';
                $walletDebit = $amountPkr;
            }

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
                'amount_currency' => $amountCurrency,
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
                    'amount_usd' => $amount,
                    'amount_pkr' => $amountPkr,
                    'exchange_rate' => $exchangeRate,
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
                    'amount_usd' => $amount,
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
            ];
        });
    }
}
