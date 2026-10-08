<?php

use App\Http\Resources\UserResource;
use App\Models\Deposit;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Wallet;
use App\Support\ExchangeRateService;
use App\Support\InvestorDepositFx;
use App\Support\UserDisplayCurrency;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

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
    Http::fake(['*' => Http::response(null, 500)]);

    PlatformSetting::query()->create([
        'site_name' => 'OG Exports',
        'registration_open' => true,
        'investment_open' => true,
        'supplier_module_enabled' => true,
        'investment_module_enabled' => true,
        'invest_pkr_display_enabled' => true,
        'invest_dual_currency_enabled' => true,
        'currency' => 'USD',
    ]);
});

function fxAvgInvestor(): User
{
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    UserProfile::query()->create([
        'user_id' => $investor->id,
        'country' => 'Pakistan',
    ]);

    Wallet::query()->create([
        'user_id' => $investor->id,
        'currency' => 'PKR',
        'available_balance' => 0,
        'pending_balance' => 0,
    ]);

    return $investor;
}

it('computes amount-weighted average deposit FX rate', function () {
    $investor = fxAvgInvestor();

    Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 27850,
        'currency' => 'PKR',
        'method' => 'bank_transfer',
        'status' => 'approved',
        'amount_usd' => 100,
        'usd_exchange_rate' => 278.5,
        'converted_amount' => 27850,
        'wallet_currency' => 'PKR',
    ]);

    Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 55700,
        'currency' => 'PKR',
        'method' => 'bank_transfer',
        'status' => 'approved',
        'amount_usd' => 200,
        'usd_exchange_rate' => 280.0,
        'converted_amount' => 55700,
        'wallet_currency' => 'PKR',
    ]);

    // Weighted: (27850*278.5 + 55700*280) / (27850+55700)
    $expected = (27850 * 278.5 + 55700 * 280.0) / (27850 + 55700);

    expect(InvestorDepositFx::weightedAverageDepositRate($investor->id))
        ->toEqualWithDelta(round($expected, 8), 0.00000001);
});

it('falls back to live rate when investor has no deposit FX history', function () {
    $investor = fxAvgInvestor();

    expect(InvestorDepositFx::weightedAverageDepositRate($investor->id))->toBeNull()
        ->and(InvestorDepositFx::resolveDisplayRate($investor->id))->toBe(278.5);
});

it('exposes fx block and aggregate USD on investor dashboard', function () {
    $investor = fxAvgInvestor();

    Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 27850,
        'currency' => 'PKR',
        'method' => 'bank_transfer',
        'status' => 'approved',
        'amount_usd' => 100,
        'usd_exchange_rate' => 278.5,
        'converted_amount' => 27850,
        'wallet_currency' => 'PKR',
    ]);

    Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 55700,
        'currency' => 'PKR',
        'method' => 'bank_transfer',
        'status' => 'approved',
        'amount_usd' => 200,
        'usd_exchange_rate' => 280.0,
        'converted_amount' => 55700,
        'wallet_currency' => 'PKR',
    ]);

    $expectedAvg = round((27850 * 278.5 + 55700 * 280.0) / (27850 + 55700), 8);
    $totalDeposits = 27850 + 55700;
    // USD dashboard totals use each deposit's submission-time USD snapshot.
    $expectedDepositsUsd = 100 + 200;

    $response = $this->actingAs($investor)
        ->getJson('/api/investor/dashboard')
        ->assertOk();

    $response->assertJsonPath('data.fx.dual_currency_enabled', true)
        ->assertJsonPath('data.fx.pkr_display_enabled', true)
        ->assertJsonPath('data.fx.display_usd_rate', $expectedAvg)
        ->assertJsonPath('data.summary.total_deposits', $totalDeposits)
        ->assertJsonPath('data.summary.total_deposits_usd', $expectedDepositsUsd);

    expect((float) $response->json('data.fx.avg_deposit_usd_rate'))
        ->toEqualWithDelta($expectedAvg, 0.00000001);
});

it('uses live rate for dashboard display when no deposit rates exist', function () {
    $investor = fxAvgInvestor();

    $response = $this->actingAs($investor)
        ->getJson('/api/investor/dashboard')
        ->assertOk();

    $response->assertJsonPath('data.fx.avg_deposit_usd_rate', null)
        ->assertJsonPath('data.fx.display_usd_rate', 278.5)
        ->assertJsonPath('data.fx.dual_currency_enabled', true);
});

it('exposes invest_dual_currency_enabled in public settings defaulting to true', function () {
    $this->getJson('/api/settings')
        ->assertOk()
        ->assertJsonPath('data.invest_dual_currency_enabled', true)
        ->assertJsonPath('data.invest_pkr_display_enabled', true);
});

it('allows admin to disable dual currency display', function () {
    $admin = User::factory()->create(['account_status' => 'active']);
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->putJson('/api/admin/cms/platform-settings', [
            'invest_dual_currency_enabled' => false,
        ])
        ->assertOk()
        ->assertJsonPath('data.invest_dual_currency_enabled', false);

    expect(PlatformSetting::dualCurrencyEnabled())->toBeFalse();
});

it('allows admin to disable PKR display for all investors', function () {
    $admin = User::factory()->create(['account_status' => 'active']);
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->putJson('/api/admin/cms/platform-settings', [
            'invest_pkr_display_enabled' => false,
        ])
        ->assertOk()
        ->assertJsonPath('data.invest_pkr_display_enabled', false);

    expect(PlatformSetting::pkrDisplayEnabled())->toBeFalse();

    $investor = fxAvgInvestor();
    $payload = (new UserResource($investor))->resolve();
    expect($payload['investPkrDisplayEnabled'])->toBeFalse()
        ->and($payload['invest_pkr_display_enabled'])->toBeFalse()
        ->and($payload['displayPkr'])->toBeFalse();
});

it('formats PKR amounts without USD brackets when dual currency is disabled', function () {
    PlatformSetting::query()->update(['invest_dual_currency_enabled' => false]);

    $investor = fxAvgInvestor();

    expect(UserDisplayCurrency::formatInvestmentDual($investor, 10.0, 1000.0))
        ->toBe('PKR 1,000.00')
        ->not->toContain('$');

    expect(UserDisplayCurrency::formatWalletDual($investor, 1000.0))
        ->toBe('PKR 1,000.00')
        ->not->toContain('$');

    $payload = (new UserResource($investor))->resolve();
    expect($payload['investDualCurrencyEnabled'])->toBeFalse()
        ->and($payload['invest_dual_currency_enabled'])->toBeFalse()
        ->and($payload['investPkrDisplayEnabled'])->toBeTrue();
});

it('formats PKR amounts with USD brackets when dual currency is enabled', function () {
    PlatformSetting::query()->update(['invest_dual_currency_enabled' => true]);

    $investor = fxAvgInvestor();

    expect(UserDisplayCurrency::formatInvestmentDual($investor, 10.0, 1000.0))
        ->toBe('PKR 1,000.00 ($10.00)');
});

it('formats PK investor amounts as USD only when PKR display is disabled', function () {
    PlatformSetting::query()->update(['invest_pkr_display_enabled' => false]);

    $investor = fxAvgInvestor();

    expect(UserDisplayCurrency::formatInvestmentDual($investor, 10.0, 1000.0))
        ->toBe('$10.00')
        ->and(UserDisplayCurrency::formatWalletDual($investor, 2785.0))
        ->toBe('$10.00');
});

it('still exposes display_usd_rate on dashboard when PKR display is disabled', function () {
    PlatformSetting::query()->update(['invest_pkr_display_enabled' => false]);

    $investor = fxAvgInvestor();

    Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 27850,
        'currency' => 'PKR',
        'method' => 'bank_transfer',
        'status' => 'approved',
        'amount_usd' => 100,
        'usd_exchange_rate' => 278.5,
        'converted_amount' => 27850,
        'wallet_currency' => 'PKR',
    ]);

    $this->actingAs($investor)
        ->getJson('/api/investor/dashboard')
        ->assertOk()
        ->assertJsonPath('data.fx.pkr_display_enabled', false)
        ->assertJsonPath('data.fx.display_usd_rate', 278.5);
});
