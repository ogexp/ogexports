<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class ExchangeRateService
{
    private const CACHE_KEY = 'exchange_rates_usd_base';

    /**
     * @return array<string, float>
     */
    public static function supportedCurrencies(): array
    {
        return config('currency.supported', ['USD', 'PKR']);
    }

    public static function isSupported(string $currency): bool
    {
        return in_array(strtoupper(trim($currency)), self::supportedCurrencies(), true);
    }

    /**
     * @return array{rates: array<string, float>, as_of: string|null}
     */
    public static function getRates(): array
    {
        $ttl = config('currency.cache_ttl', 3600);

        return Cache::remember(self::CACHE_KEY, $ttl, function () {
            return self::fetchRates();
        });
    }

    /**
     * @return array{amount: float, rate: float, as_of: string|null, from: string, to: string}
     */
    public static function convert(float $amount, string $from, string $to): array
    {
        $from = strtoupper(trim($from));
        $to = strtoupper(trim($to));

        if (! self::isSupported($from) || ! self::isSupported($to)) {
            throw new RuntimeException("Unsupported currency pair: {$from} → {$to}");
        }

        if ($from === $to) {
            return [
                'amount' => round($amount, 2),
                'rate' => 1.0,
                'as_of' => self::getRates()['as_of'],
                'from' => $from,
                'to' => $to,
            ];
        }

        $payload = self::getRates();
        $rates = $payload['rates'];

        // Rates are USD-base: rate[X] = how many X per 1 USD
        $fromRate = $rates[$from] ?? null;
        $toRate = $rates[$to] ?? null;

        if ($fromRate === null || $toRate === null || $fromRate <= 0) {
            throw new RuntimeException("Missing exchange rate for {$from} or {$to}");
        }

        // Convert: amount in FROM → USD → TO
        $usdAmount = $from === 'USD' ? $amount : $amount / $fromRate;
        $converted = $to === 'USD' ? $usdAmount : $usdAmount * $toRate;

        // Effective cross-rate: 1 FROM = ? TO
        $effectiveRate = $from === 'USD'
            ? $toRate
            : ($to === 'USD' ? (1 / $fromRate) : ($toRate / $fromRate));

        return [
            'amount' => round($converted, 2),
            'rate' => round($effectiveRate, 8),
            'as_of' => $payload['as_of'],
            'from' => $from,
            'to' => $to,
        ];
    }

    /**
     * USD equivalent of a PKR amount, plus the locked PKR-per-1-USD rate.
     *
     * Rate semantics match container investments (`convert(1, USD, PKR)['rate']`).
     *
     * @return array{amount_usd: float, exchange_rate: float, as_of: string|null}
     */
    public static function pkrToUsdSnapshot(float $pkrAmount): array
    {
        $usd = self::convert($pkrAmount, 'PKR', 'USD');
        $rate = self::convert(1.0, 'USD', 'PKR');

        return [
            'amount_usd' => $usd['amount'],
            'exchange_rate' => $rate['rate'],
            'as_of' => $usd['as_of'],
        ];
    }

    /**
     * @return array{rates: array<string, float>, as_of: string|null}
     */
    private static function fetchRates(): array
    {
        $supported = self::supportedCurrencies();
        $fallback = config('currency.fallback_rates', ['USD' => 1]);
        $asOf = now()->toIso8601String();

        try {
            $response = Http::timeout(10)->get(config('currency.api_url'));

            if ($response->successful()) {
                $data = $response->json();

                if (($data['result'] ?? '') === 'success' && is_array($data['rates'] ?? null)) {
                    $rates = ['USD' => 1.0];

                    foreach ($supported as $code) {
                        if ($code === 'USD') {
                            continue;
                        }
                        $rates[$code] = (float) ($data['rates'][$code] ?? $fallback[$code] ?? 1);
                    }

                    $asOf = isset($data['time_last_update_unix'])
                        ? date('c', (int) $data['time_last_update_unix'])
                        : now()->toIso8601String();

                    return ['rates' => $rates, 'as_of' => $asOf];
                }
            }
        } catch (\Throwable) {
            // fall through to fallback
        }

        $rates = ['USD' => 1.0];
        foreach ($supported as $code) {
            if ($code !== 'USD') {
                $rates[$code] = (float) ($fallback[$code] ?? 1);
            }
        }

        return ['rates' => $rates, 'as_of' => $asOf];
    }

    /** Clear cached rates (useful in tests). */
    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
