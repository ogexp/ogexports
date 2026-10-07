<?php

namespace App\Support;

class WithdrawalTerms
{
    /**
     * @return array{fee: float, fee_usd: float, fee_currency: string, estimated_processing_time: string}
     */
    public static function forCurrency(string $currency, ?float $exchangeRate = null): array
    {
        $currency = strtoupper(trim($currency));
        $feeUsd = round((float) config('withdrawal.fee_usd', 2), 2);

        $rate = $currency === 'USD'
            ? 1.0
            : ($exchangeRate ?? ExchangeRateService::convert(1.0, 'USD', $currency)['rate']);

        return [
            'fee' => round($feeUsd * $rate, 2),
            'fee_usd' => $feeUsd,
            'fee_currency' => $currency,
            'estimated_processing_time' => (string) config('withdrawal.estimated_processing_time', '1 to 2 working days'),
        ];
    }
}
