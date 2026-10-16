<?php

namespace App\Console\Commands;

use App\Models\Deposit;
use App\Models\Wallet;
use App\Models\WalletCurrencyConversion;
use App\Models\WalletTransaction;
use App\Models\Withdrawal;
use App\Support\ExchangeRateService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class NormalizeInvestorWalletsToUsd extends Command
{
    protected $signature = 'wallets:normalize-usd {--apply : Convert safe non-USD wallet balances; without this flag the command only reports}';

    protected $description = 'Convert safe legacy investor wallets to USD and preserve their original ledger currencies';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');
        $converted = 0;
        $skipped = 0;
        $unchanged = 0;

        if (! $apply) {
            $this->warn('Dry run only. No wallet or ledger records will be changed. Use --apply to perform conversions.');
        }

        Wallet::query()
            ->orderBy('id')
            ->chunkById(100, function ($wallets) use ($apply, &$converted, &$skipped, &$unchanged): void {
                foreach ($wallets as $wallet) {
                    try {
                        $result = DB::transaction(function () use ($wallet, $apply): array {
                            $lockedWallet = Wallet::query()->whereKey($wallet->id)->lockForUpdate()->first();
                            if (! $lockedWallet) {
                                return ['status' => 'skipped', 'reason' => 'wallet disappeared'];
                            }

                            $sourceCurrency = strtoupper(trim((string) $lockedWallet->currency));
                            if ($sourceCurrency === 'USD') {
                                return ['status' => 'unchanged'];
                            }

                            $unsafeReason = $this->unsafeReason($lockedWallet);
                            if ($unsafeReason !== null) {
                                return ['status' => 'skipped', 'reason' => $unsafeReason];
                            }

                            if (! ExchangeRateService::isSupported($sourceCurrency)) {
                                return ['status' => 'skipped', 'reason' => "unsupported currency {$sourceCurrency}"];
                            }

                            $fromAmount = round((float) $lockedWallet->available_balance, 2);
                            if ($fromAmount < 0) {
                                return ['status' => 'skipped', 'reason' => 'negative available balance'];
                            }
                            $ledgerBalance = 0.0;
                            foreach ($lockedWallet->transactions()->lockForUpdate()->where('status', 'completed')->get() as $transaction) {
                                $transactionAmount = round((float) $transaction->amount, 2);
                                if ($transactionAmount < 0 || ! in_array($transaction->direction, ['credit', 'debit'], true)) {
                                    return ['status' => 'skipped', 'reason' => 'wallet ledger contains an invalid posted movement'];
                                }
                                $ledgerBalance += $transaction->direction === 'credit'
                                    ? $transactionAmount
                                    : -$transactionAmount;
                            }
                            if (abs(round($ledgerBalance, 2) - $fromAmount) > 0.01) {
                                return ['status' => 'skipped', 'reason' => 'posted wallet ledger does not reconcile to available balance'];
                            }

                            $conversion = ExchangeRateService::convert($fromAmount, $sourceCurrency, 'USD');
                            $toAmount = $conversion['amount'];

                            if (! $apply) {
                                return [
                                    'status' => 'would_convert',
                                    'from_currency' => $sourceCurrency,
                                    'from_amount' => $fromAmount,
                                    'to_amount' => $toAmount,
                                    'rate' => $conversion['rate'],
                                    'as_of' => $conversion['as_of'],
                                ];
                            }

                            foreach ($lockedWallet->transactions()->lockForUpdate()->get() as $transaction) {
                                $meta = is_array($transaction->meta) ? $transaction->meta : [];
                                if (! isset($meta['currency'])) {
                                    $meta['currency'] = strtoupper((string) ($meta['wallet_currency'] ?? $sourceCurrency));
                                    $transaction->meta = $meta;
                                    $transaction->save();
                                }
                            }

                            $lockedWallet->forceFill([
                                'currency' => 'USD',
                                'available_balance' => $toAmount,
                            ])->save();

                            WalletCurrencyConversion::query()->create([
                                'wallet_id' => $lockedWallet->id,
                                'initiated_by' => null,
                                'from_currency' => $sourceCurrency,
                                'to_currency' => 'USD',
                                'from_amount' => $fromAmount,
                                'to_amount' => $toAmount,
                                'exchange_rate' => $conversion['rate'],
                                'rates_as_of' => $conversion['as_of'],
                            ]);

                            return [
                                'status' => 'converted',
                                'from_currency' => $sourceCurrency,
                                'from_amount' => $fromAmount,
                                'to_amount' => $toAmount,
                                'rate' => $conversion['rate'],
                                'as_of' => $conversion['as_of'],
                            ];
                        }, 3);
                    } catch (Throwable $exception) {
                        $result = ['status' => 'skipped', 'reason' => $exception->getMessage()];
                    }

                    if ($result['status'] === 'unchanged') {
                        $unchanged++;
                        continue;
                    }

                    if ($result['status'] === 'skipped') {
                        $skipped++;
                        $this->warn("Wallet {$wallet->id} skipped: {$result['reason']}.");
                        continue;
                    }

                    if ($result['status'] === 'would_convert') {
                        $converted++;
                        $this->line(
                            "Wallet {$wallet->id}: {$result['from_currency']} "
                            .number_format($result['from_amount'], 2, '.', '')
                            .' → USD '.number_format($result['to_amount'], 2, '.', '')
                            .' at rate '.number_format((float) $result['rate'], 8, '.', '')
                            .' (as of '.($result['as_of'] ?? 'unknown').')'
                        );
                        continue;
                    }

                    $converted++;
                    $this->info(
                        "Wallet {$wallet->id} converted: {$result['from_currency']} "
                        .number_format($result['from_amount'], 2, '.', '')
                        .' → USD '.number_format($result['to_amount'], 2, '.', '')
                        .' at rate '.number_format((float) $result['rate'], 8, '.', '')
                        .' (as of '.($result['as_of'] ?? 'unknown').')'
                    );
                }
            });

        $verb = $apply ? 'Converted' : 'Would convert';
        $this->info("{$verb} {$converted} wallet(s); {$unchanged} already USD; {$skipped} skipped.");

        return $skipped > 0 ? self::FAILURE : self::SUCCESS;
    }

    private function unsafeReason(Wallet $wallet): ?string
    {
        if (abs((float) $wallet->pending_balance) > 0.0001) {
            return 'pending wallet balance is non-zero';
        }

        if (Deposit::query()
            ->where('investor_id', $wallet->user_id)
            ->whereNotIn('status', ['approved', 'rejected', 'cancelled', 'failed'])
            ->exists()) {
            return 'deposit is pending or unresolved';
        }

        if (Withdrawal::query()
            ->where('investor_id', $wallet->user_id)
            ->whereIn('status', ['pending', 'processing', 'review', 'under_review'])
            ->exists()) {
            return 'withdrawal is pending or under review';
        }

        if (WalletTransaction::query()
            ->where('wallet_id', $wallet->id)
            ->whereNotIn('status', ['completed', 'rejected', 'cancelled', 'failed'])
            ->exists()) {
            return 'wallet transaction has an unresolved status';
        }

        return null;
    }
}
