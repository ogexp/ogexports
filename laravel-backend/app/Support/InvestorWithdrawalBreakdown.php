<?php

namespace App\Support;

use App\Models\WalletTransaction;
use App\Models\Withdrawal;

class InvestorWithdrawalBreakdown
{
    /**
     * @return array{
     *     payout_amount: float,
     *     payout_amount_usd: float|null,
     *     fee: float|null,
     *     fee_usd: float|null,
     *     total_debit: float|null,
     *     total_debit_usd: float|null,
     *     currency: string|null,
     *     exchange_rate: float|null
     * }
     */
    public static function fromWithdrawal(
        Withdrawal $withdrawal,
        ?WalletTransaction $transaction = null,
    ): array {
        if ($transaction === null) {
            $transaction = WalletTransaction::query()
                ->where('type', 'withdrawal')
                ->where('meta->withdrawal_id', $withdrawal->id)
                ->latest('id')
                ->first();
        }

        $transaction?->loadMissing('wallet');
        $meta = is_array($transaction?->meta) ? $transaction->meta : [];
        $bankDetails = is_array($withdrawal->bank_details) ? $withdrawal->bank_details : [];
        $currency = self::stringValue($bankDetails['currency'] ?? null)
            ?? self::stringValue($transaction?->wallet?->currency)
            ?? self::stringValue($meta['currency'] ?? null);

        $totalDebit = self::recordedMoney($withdrawal->total_debit, $meta, 'total_debit');
        if ($totalDebit === null && $transaction?->direction === 'debit' && $transaction->amount !== null) {
            // The ledger amount is the actual reserved/debited total for older rows
            // that predate the dedicated total_debit column.
            $totalDebit = (float) $transaction->amount;
        }

        return [
            'payout_amount' => (float) $withdrawal->amount,
            'payout_amount_usd' => self::recordedMoney($withdrawal->amount_usd, $meta, 'amount_usd'),
            'fee' => self::recordedMoney($withdrawal->fee, $meta, 'fee'),
            'fee_usd' => self::recordedMoney($withdrawal->fee_usd, $meta, 'fee_usd'),
            'total_debit' => $totalDebit,
            'total_debit_usd' => self::recordedMoney($withdrawal->total_debit_usd, $meta, 'total_debit_usd'),
            'currency' => $currency,
            'exchange_rate' => self::recordedMoney($withdrawal->exchange_rate, $meta, 'exchange_rate'),
        ];
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private static function recordedMoney(mixed $columnValue, array $meta, string $metaKey): ?float
    {
        if ($columnValue !== null && is_numeric($columnValue)) {
            return (float) $columnValue;
        }

        $metaValue = $meta[$metaKey] ?? null;

        return $metaValue !== null && is_numeric($metaValue) ? (float) $metaValue : null;
    }

    private static function stringValue(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        return strtoupper(trim($value));
    }
}
