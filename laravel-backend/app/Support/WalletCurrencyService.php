<?php

namespace App\Support;

use App\Models\Deposit;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletCurrencyConversion;
use App\Models\WalletTransaction;
use App\Models\Withdrawal;
use Illuminate\Validation\ValidationException;
use Throwable;

class WalletCurrencyService
{
    private const PROFILE_CURRENCIES = ['USD', 'PKR', 'EUR', 'GBP'];

    /**
     * Change an investor's actual wallet denomination. The caller must run this
     * inside the same database transaction that saves the Profile preference.
     *
     * @return array<string, mixed>|null
     */
    public function change(User $user, string $targetCurrency): ?array
    {
        $targetCurrency = strtoupper(trim($targetCurrency));
        if (! in_array($targetCurrency, self::PROFILE_CURRENCIES, true)
            || ! ExchangeRateService::isSupported($targetCurrency)) {
            throw ValidationException::withMessages([
                'preferences.currency' => ['Select a supported Profile currency.'],
            ]);
        }

        $wallet = Wallet::query()
            ->where('user_id', $user->id)
            ->lockForUpdate()
            ->first();

        if (! $wallet) {
            Wallet::query()->create([
                'user_id' => $user->id,
                'currency' => $targetCurrency,
                'available_balance' => 0,
                'pending_balance' => 0,
            ]);

            return null;
        }

        $sourceCurrency = strtoupper(trim((string) $wallet->currency));
        if ($sourceCurrency === $targetCurrency) {
            return null;
        }

        $hasPendingDeposit = Deposit::query()
            ->where('investor_id', $user->id)
            ->whereNotIn('status', ['approved', 'rejected', 'cancelled', 'failed'])
            ->exists();
        $hasPendingWithdrawal = Withdrawal::query()
            ->where('investor_id', $user->id)
            ->whereIn('status', ['pending', 'processing', 'review', 'under_review'])
            ->exists();
        $hasPendingWalletTransaction = WalletTransaction::query()
            ->where('wallet_id', $wallet->id)
            ->where('status', 'pending')
            ->exists();

        if ((float) $wallet->pending_balance > 0.0001
            || $hasPendingDeposit
            || $hasPendingWithdrawal
            || $hasPendingWalletTransaction) {
            throw ValidationException::withMessages([
                'preferences.currency' => [
                    'Wallet currency cannot be changed while a deposit or withdrawal is pending.',
                ],
            ]);
        }

        $fromAmount = round((float) $wallet->available_balance, 2);
        $toAmount = $fromAmount;
        $rate = null;
        $ratesAsOf = null;

        if (abs($fromAmount) > 0.0001) {
            try {
                $conversion = ExchangeRateService::convert($fromAmount, $sourceCurrency, $targetCurrency);
            } catch (Throwable) {
                throw ValidationException::withMessages([
                    'preferences.currency' => [
                        'The current exchange rate is unavailable. The wallet and Profile currency were not changed.',
                    ],
                ]);
            }

            $toAmount = $conversion['amount'];
            $rate = $conversion['rate'];
            $ratesAsOf = $conversion['as_of'];
        }

        // Existing ledger amounts belong to the wallet's previous currency.
        // Preserve that fact before changing the wallet denomination.
        foreach ($wallet->transactions()->lockForUpdate()->get() as $transaction) {
            $meta = is_array($transaction->meta) ? $transaction->meta : [];
            if (! isset($meta['currency'])) {
                $meta['currency'] = strtoupper((string) (
                    $meta['wallet_currency']
                    ?? $meta['currency']
                    ?? $sourceCurrency
                ));
                $transaction->meta = $meta;
                $transaction->save();
            }
        }

        $wallet->forceFill([
            'currency' => $targetCurrency,
            'available_balance' => $toAmount,
        ])->save();

        $record = WalletCurrencyConversion::query()->create([
            'wallet_id' => $wallet->id,
            'initiated_by' => $user->id,
            'from_currency' => $sourceCurrency,
            'to_currency' => $targetCurrency,
            'from_amount' => $fromAmount,
            'to_amount' => $toAmount,
            'exchange_rate' => $rate,
            'rates_as_of' => $ratesAsOf,
        ]);

        return $record->toArray();
    }
}
