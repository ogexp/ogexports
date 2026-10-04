<?php

use App\Models\Investment;
use App\Models\InvestmentProject;
use App\Models\KycApplication;
use App\Models\PlatformSetting;
use App\Models\PlatformWallet;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Wallet;
use App\Support\ExchangeRateService;
use App\Support\InvestmentReviewService;
use App\Support\PlatformWalletService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    PlatformSetting::query()->create([
        'site_name' => 'OG Exports',
        'registration_open' => true,
        'investment_open' => true,
        'supplier_module_enabled' => true,
        'investment_module_enabled' => true,
        'currency' => 'USD',
    ]);

    ExchangeRateService::clearCache();
    config(['currency.fallback_rates' => [
        'USD' => 1,
        'PKR' => 278.5,
        'GBP' => 0.79,
        'EUR' => 0.92,
        'CNY' => 7.25,
        'SAR' => 3.75,
        'AED' => 3.67,
        'OMR' => 0.385,
        'QAR' => 3.64,
    ]]);
    Http::fake(['*' => Http::response(null, 500)]);

    PlatformWalletService::ensure('PKR');
    PlatformWalletService::ensure('USD');

    $this->containerProject = InvestmentProject::query()->create([
        'title' => 'Sesame Container',
        'type' => 'container',
        'trade_direction' => 'export',
        'status' => 'funding',
        'target_amount' => 100000,
        'raised_amount' => 0,
        'investors_count' => 0,
        'min_investment' => 100,
        'expected_return_pct' => 8,
        'investment_period_days' => 45,
    ]);
});

function makePkInvestor(float $pkrBalance = 1_000_000): User
{
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    UserProfile::query()->create([
        'user_id' => $investor->id,
        'country' => 'Pakistan',
    ]);

    KycApplication::query()->create([
        'user_id' => $investor->id,
        'type' => 'individual',
        'country' => 'Pakistan',
        'status' => 'approved',
        'submitted_at' => now(),
        'reviewed_at' => now(),
    ]);

    Wallet::query()->create([
        'user_id' => $investor->id,
        'currency' => 'PKR',
        'available_balance' => $pkrBalance,
        'pending_balance' => 0,
    ]);

    return $investor;
}

function makeIntlInvestor(float $usdBalance = 50_000): User
{
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    UserProfile::query()->create([
        'user_id' => $investor->id,
        'country' => 'United Arab Emirates',
    ]);

    KycApplication::query()->create([
        'user_id' => $investor->id,
        'type' => 'individual',
        'country' => 'United Arab Emirates',
        'status' => 'approved',
        'submitted_at' => now(),
        'reviewed_at' => now(),
    ]);

    Wallet::query()->create([
        'user_id' => $investor->id,
        'currency' => 'USD',
        'available_balance' => $usdBalance,
        'pending_balance' => 0,
    ]);

    return $investor;
}

it('stores PKR amount and debits PKR wallet when Pakistani investor funds a container', function () {
    $investor = makePkInvestor(1_000_000);

    $response = $this->actingAs($investor)
        ->postJson("/api/investor/projects/{$this->containerProject->id}/invest", [
            'amount' => 2000,
        ])
        ->assertCreated();

    $investment = Investment::query()->findOrFail($response->json('data.id'));

    expect((float) $investment->amount)->toBe(2000.0)
        ->and((float) $investment->amount_pkr)->toBe(557000.0)
        ->and((float) $investment->exchange_rate)->toBe(278.5)
        ->and($investment->amount_currency)->toBe('USD')
        ->and((float) $response->json('data.amount_pkr'))->toBe(557000.0);

    $wallet = Wallet::query()->where('user_id', $investor->id)->firstOrFail();
    expect((float) $wallet->available_balance)->toBe(443000.0)
        ->and($wallet->currency)->toBe('PKR');

    $platform = PlatformWallet::query()->where('currency', 'PKR')->firstOrFail();
    expect((float) $platform->balance)->toBe(557000.0);

    $this->containerProject->refresh();
    expect((float) $this->containerProject->raised_amount)->toBe(2000.0);
});

it('keeps USD-only investment for international investors', function () {
    $investor = makeIntlInvestor(50_000);

    $response = $this->actingAs($investor)
        ->postJson("/api/investor/projects/{$this->containerProject->id}/invest", [
            'amount' => 2000,
        ])
        ->assertCreated();

    $investment = Investment::query()->findOrFail($response->json('data.id'));

    expect((float) $investment->amount)->toBe(2000.0)
        ->and($investment->amount_pkr)->toBeNull()
        ->and($investment->exchange_rate)->toBeNull()
        ->and($response->json('data.amount_pkr'))->toBeNull();

    $wallet = Wallet::query()->where('user_id', $investor->id)->firstOrFail();
    expect((float) $wallet->available_balance)->toBe(48000.0)
        ->and($wallet->currency)->toBe('USD');
});

it('rejects PK container invest when PKR wallet balance is insufficient', function () {
    $investor = makePkInvestor(1000);

    $this->actingAs($investor)
        ->postJson("/api/investor/projects/{$this->containerProject->id}/invest", [
            'amount' => 2000,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['amount']);

    expect(Investment::query()->count())->toBe(0);
});

it('sets profit_amount_pkr and credits PKR wallet on completion', function () {
    $investor = makePkInvestor(1_000_000);

    $response = $this->actingAs($investor)
        ->postJson("/api/investor/projects/{$this->containerProject->id}/invest", [
            'amount' => 2000,
        ])
        ->assertCreated();

    $investment = Investment::query()->findOrFail($response->json('data.id'));

    // Platform needs enough PKR to pay principal + profit back
    PlatformWalletService::credit(
        100_000,
        'profit_reserve',
        'TEST-TOPUP-'.$investment->id,
        [],
        'PKR',
    );

    $completed = app(InvestmentReviewService::class)->complete($investment);

    expect((float) $completed->profit_amount)->toBe(160.0)
        ->and((float) $completed->profit_amount_pkr)->toBe(44560.0)
        ->and($completed->status)->toBe('completed');

    $wallet = Wallet::query()->where('user_id', $investor->id)->firstOrFail();
    // Started 1_000_000, debited 557_000, credited 557_000 + 44_560 = 601_560 → balance 1_044_560
    expect((float) $wallet->available_balance)->toBe(1_044_560.0);

    $dist = $completed->profitDistribution;
    expect($dist)->not->toBeNull()
        ->and((float) $dist->invested_amount_pkr)->toBe(557000.0)
        ->and((float) $dist->profit_amount_pkr)->toBe(44560.0);
});
