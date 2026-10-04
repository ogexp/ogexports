<?php

use App\Support\ExchangeRateService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    ExchangeRateService::clearCache();
    config(['currency.fallback_rates' => [
        'USD' => 1,
        'GBP' => 0.79,
        'EUR' => 0.92,
        'CNY' => 7.25,
        'PKR' => 278.5,
        'SAR' => 3.75,
        'AED' => 3.67,
        'OMR' => 0.385,
        'QAR' => 3.64,
    ]]);
});

it('converts USD to PKR using fallback rates when API fails', function () {
    Http::fake(['*' => Http::response(null, 500)]);

    $result = ExchangeRateService::convert(100, 'USD', 'PKR');

    expect($result['amount'])->toBe(27850.0)
        ->and($result['from'])->toBe('USD')
        ->and($result['to'])->toBe('PKR');
});

it('converts GBP to USD using fallback rates', function () {
    Http::fake(['*' => Http::response(null, 500)]);

    $result = ExchangeRateService::convert(500, 'GBP', 'USD');

    // 500 GBP → 500/0.79 USD ≈ 632.91
    expect($result['amount'])->toBe(632.91)
        ->and($result['from'])->toBe('GBP')
        ->and($result['to'])->toBe('USD');
});

it('returns same amount for identical currencies', function () {
    $result = ExchangeRateService::convert(1500, 'USD', 'USD');

    expect($result['amount'])->toBe(1500.0)
        ->and($result['rate'])->toBe(1.0);
});

it('caches exchange rates', function () {
    Http::fake([
        '*' => Http::response([
            'result' => 'success',
            'rates' => ['PKR' => 280, 'GBP' => 0.80],
            'time_last_update_unix' => time(),
        ]),
    ]);

    ExchangeRateService::getRates();
    ExchangeRateService::getRates();

    Http::assertSentCount(1);
    expect(Cache::has('exchange_rates_usd_base'))->toBeTrue();
});

it('lists supported currencies', function () {
    expect(ExchangeRateService::supportedCurrencies())->toContain('USD', 'PKR', 'GBP', 'EUR');
    expect(ExchangeRateService::isSupported('pkr'))->toBeTrue();
    expect(ExchangeRateService::isSupported('JPY'))->toBeFalse();
});
