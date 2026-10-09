<?php

use App\Models\PlatformSetting;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Wallet;
use App\Support\ExchangeRateService;
use App\Support\UserDisplayCurrency;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(Tests\TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    ExchangeRateService::clearCache();
    config(['currency.fallback_rates' => [
        'USD' => 1,
        'PKR' => 278.5,
    ]]);
    Http::fake(['*' => Http::response(null, 500)]);
});

function pkInvestorForDual(): User
{
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    UserProfile::query()->create([
        'user_id' => $investor->id,
        'country' => 'Pakistan',
        'company_name' => 'PK Dual Co',
    ]);

    Wallet::query()->create([
        'user_id' => $investor->id,
        'currency' => 'PKR',
        'available_balance' => 100000,
        'pending_balance' => 0,
    ]);

    return $investor->fresh(['profile', 'wallet']);
}

it('defaults an investor without a stored Profile currency to USD regardless of country', function () {
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    UserProfile::query()->create([
        'user_id' => $investor->id,
        'country' => 'Pakistan',
        'company_name' => 'USD Default Co',
        'meta' => [],
    ]);

    expect(UserDisplayCurrency::currencyForUser($investor))->toBe('USD');
});

it('formats investment as PKR only when dual currency is disabled', function () {
    PlatformSetting::query()->create([
        'site_name' => 'OG Exports',
        'invest_pkr_display_enabled' => true,
        'invest_dual_currency_enabled' => false,
        'currency' => 'USD',
    ]);

    $investor = pkInvestorForDual();

    expect(UserDisplayCurrency::formatInvestmentDual($investor, 10.0, 1000.0))
        ->toBe('PKR 1,000.00')
        ->not->toContain('$');
});

it('formats investment as PKR with USD brackets when dual currency is enabled', function () {
    PlatformSetting::query()->create([
        'site_name' => 'OG Exports',
        'invest_pkr_display_enabled' => true,
        'invest_dual_currency_enabled' => true,
        'currency' => 'USD',
    ]);

    $investor = pkInvestorForDual();

    expect(UserDisplayCurrency::formatInvestmentDual($investor, 10.0, 1000.0))
        ->toBe('PKR 1,000.00 ($10.00)');
});

it('formats wallet amounts as PKR only when dual currency is disabled', function () {
    PlatformSetting::query()->create([
        'site_name' => 'OG Exports',
        'invest_pkr_display_enabled' => true,
        'invest_dual_currency_enabled' => false,
        'currency' => 'USD',
    ]);

    $investor = pkInvestorForDual();

    expect(UserDisplayCurrency::formatWalletDual($investor, 1000.0))
        ->toBe('PKR 1,000.00')
        ->not->toContain('$');
});

it('formats PK investor amounts as USD only when PKR display is disabled', function () {
    PlatformSetting::query()->create([
        'site_name' => 'OG Exports',
        'invest_pkr_display_enabled' => false,
        'invest_dual_currency_enabled' => true,
        'currency' => 'USD',
    ]);

    $investor = pkInvestorForDual();

    expect(UserDisplayCurrency::shouldDisplayPkr($investor))->toBeFalse()
        ->and(UserDisplayCurrency::isPkrUser($investor))->toBeTrue()
        ->and(UserDisplayCurrency::formatInvestmentDual($investor, 10.0, 1000.0))
        ->toBe('$10.00')
        ->and(UserDisplayCurrency::formatWalletDual($investor, 2785.0))
        ->toBe('$10.00');

    $ctx = UserDisplayCurrency::contextForUser($investor);
    expect($ctx['display_pkr'])->toBeFalse();
});

it('exposes the Profile currency separately from the server wallet amount currency', function () {
    $investor = pkInvestorForDual();
    $profile = $investor->profile;
    $meta = is_array($profile->meta) ? $profile->meta : [];
    $meta['preferences'] = ['currency' => 'USD'];
    $profile->update(['meta' => $meta]);

    $investor = $investor->fresh(['profile', 'wallet']);
    $context = UserDisplayCurrency::contextForUser($investor);
    $payload = UserDisplayCurrency::userPayload($investor);

    expect($context['profile_currency'])->toBe('USD')
        ->and($context['wallet_currency'])->toBe('PKR')
        ->and($payload['profile_currency'])->toBe('USD');
});
