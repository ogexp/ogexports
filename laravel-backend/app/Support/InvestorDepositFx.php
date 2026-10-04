<?php

namespace App\Support;

use App\Models\Deposit;

class InvestorDepositFx
{
    /**
     * Amount-weighted average of locked PKR-per-USD rates from approved PKR deposits.
     * Returns null when the investor has no deposits with a stored rate.
     */
    public static function weightedAverageDepositRate(int $investorId): ?float
    {
        $deposits = Deposit::query()
            ->where('investor_id', $investorId)
            ->whereIn('status', ['approved', 'completed'])
            ->whereRaw('UPPER(currency) = ?', ['PKR'])
            ->whereNotNull('usd_exchange_rate')
            ->where('usd_exchange_rate', '>', 0)
            ->get(['amount', 'usd_exchange_rate']);

        if ($deposits->isEmpty()) {
            return null;
        }

        $weightedSum = 0.0;
        $totalAmount = 0.0;

        foreach ($deposits as $deposit) {
            $amount = (float) $deposit->amount;
            $rate = (float) $deposit->usd_exchange_rate;

            if ($amount <= 0 || $rate <= 0) {
                continue;
            }

            $weightedSum += $amount * $rate;
            $totalAmount += $amount;
        }

        if ($totalAmount <= 0) {
            return null;
        }

        return round($weightedSum / $totalAmount, 8);
    }

    /**
     * Rate to use for aggregate dual-currency display (PKR per 1 USD).
     * Prefers weighted average of deposit rates; falls back to live/cached FX.
     */
    public static function resolveDisplayRate(int $investorId): float
    {
        $avg = self::weightedAverageDepositRate($investorId);

        if ($avg !== null && $avg > 0) {
            return $avg;
        }

        try {
            return (float) ExchangeRateService::convert(1.0, 'USD', 'PKR')['rate'];
        } catch (\Throwable) {
            return (float) (config('currency.fallback_rates.PKR') ?: 278.5);
        }
    }

    /**
     * Convert a PKR amount to USD using the investor's display rate.
     */
    public static function pkrToUsd(float $pkrAmount, float $displayRate): float
    {
        if ($displayRate <= 0) {
            return 0.0;
        }

        return round($pkrAmount / $displayRate, 2);
    }
}
