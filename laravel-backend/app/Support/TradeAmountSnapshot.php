<?php

namespace App\Support;

/**
 * Compute locked USD/PKR snapshots for trade amounts (offers, orders).
 * Rate semantics: PKR per 1 USD (same as ExchangeRateService::pkrToUsdSnapshot).
 */
class TradeAmountSnapshot
{
    /**
     * @return array{exchange_rate: float, amount_usd: float, amount_pkr: float}
     */
    public static function fromNative(float $amount, string $currency): array
    {
        $currency = strtoupper(trim($currency));
        $amount = round($amount, 2);
        $rate = self::currentPkrPerUsd();

        if ($currency === 'PKR') {
            $pkr = $amount;
            $usd = round($amount / $rate, 2);
        } else {
            $usd = $amount;
            $pkr = round($amount * $rate, 2);
        }

        return [
            'exchange_rate' => round($rate, 8),
            'amount_usd' => $usd,
            'amount_pkr' => $pkr,
        ];
    }

    /**
     * Resolve USD/PKR pair from stored snapshots or live FX.
     *
     * @return array{usd: float, pkr: float, rate: float}
     */
    public static function resolve(
        float $nativeAmount,
        string $sourceCurrency,
        ?float $usd = null,
        ?float $pkr = null,
        ?float $rate = null,
    ): array {
        $sourceCurrency = strtoupper(trim($sourceCurrency ?: 'USD'));
        $nativeAmount = round($nativeAmount, 2);
        $effectiveRate = ($rate !== null && $rate > 0) ? (float) $rate : self::currentPkrPerUsd();

        if (self::isFinite($usd) && self::isFinite($pkr)) {
            return [
                'usd' => round((float) $usd, 2),
                'pkr' => round((float) $pkr, 2),
                'rate' => $effectiveRate,
            ];
        }

        if (self::isFinite($usd)) {
            $usdVal = round((float) $usd, 2);

            return [
                'usd' => $usdVal,
                'pkr' => self::isFinite($pkr)
                    ? round((float) $pkr, 2)
                    : round($usdVal * $effectiveRate, 2),
                'rate' => $effectiveRate,
            ];
        }

        if (self::isFinite($pkr)) {
            $pkrVal = round((float) $pkr, 2);

            return [
                'usd' => round($pkrVal / $effectiveRate, 2),
                'pkr' => $pkrVal,
                'rate' => $effectiveRate,
            ];
        }

        if ($sourceCurrency === 'PKR') {
            return [
                'usd' => round($nativeAmount / $effectiveRate, 2),
                'pkr' => $nativeAmount,
                'rate' => $effectiveRate,
            ];
        }

        return [
            'usd' => $nativeAmount,
            'pkr' => round($nativeAmount * $effectiveRate, 2),
            'rate' => $effectiveRate,
        ];
    }

    public static function currentPkrPerUsd(): float
    {
        try {
            $rate = (float) ExchangeRateService::convert(1.0, 'USD', 'PKR')['rate'];
        } catch (\Throwable) {
            $rate = (float) (config('currency.fallback_rates.PKR') ?? 278.5);
        }

        return $rate > 0 ? $rate : 278.5;
    }

    private static function isFinite(mixed $value): bool
    {
        return $value !== null && is_numeric($value) && is_finite((float) $value);
    }
}
