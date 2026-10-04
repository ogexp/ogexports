<?php

use App\Models\Deposit;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Wallet;
use App\Support\ExchangeRateService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->admin = User::factory()->create(['account_status' => 'active']);
    $this->admin->assignRole('admin');

    ExchangeRateService::clearCache();
    config(['currency.fallback_rates' => [
        'USD' => 1,
        'PKR' => 278.5,
    ]]);
    Http::fake(['*' => Http::response(null, 500)]);
});

it('returns exchange rates for admin', function () {
    $this->actingAs($this->admin)
        ->getJson('/api/admin/finance/exchange-rates')
        ->assertOk()
        ->assertJsonPath('data.base', 'USD')
        ->assertJsonPath('data.rates.PKR', 278.5)
        ->assertJsonStructure(['data' => ['base', 'rates', 'as_of']]);
});

it('includes investor display currency on admin finance deposits', function () {
    $investor = User::factory()->create(['account_status' => 'active', 'name' => 'PK Investor']);
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

    Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 100,
        'currency' => 'USD',
        'method' => 'Bank Transfer',
        'reference' => 'DEP-ADMIN-1',
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/finance/deposits')
        ->assertOk();

    $row = collect($response->json('data'))->first();
    expect($row)->not->toBeNull()
        ->and($row['investor']['country'])->toBe('Pakistan')
        ->and($row['investor']['display_pkr'])->toBeTrue()
        ->and($row['investor']['display_currency'])->toBe('PKR');
});

it('includes user totals and display currency on admin users index', function () {
    $buyer = User::factory()->create(['account_status' => 'active']);
    $buyer->assignRole('buyer');
    UserProfile::query()->create([
        'user_id' => $buyer->id,
        'country' => 'Pakistan',
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/users?role=buyer')
        ->assertOk();

    $row = collect($response->json('data'))->firstWhere('id', (string) $buyer->id);
    expect($row)->not->toBeNull()
        ->and($row['displayPkr'])->toBeTrue()
        ->and($row['displayCurrency'])->toBe('PKR')
        ->and($row['ordersCount'])->toBe(0);
});

it('denies exchange rates to non-admin users', function () {
    $user = User::factory()->create(['account_status' => 'active']);
    $user->assignRole('buyer');

    $this->actingAs($user)
        ->getJson('/api/admin/finance/exchange-rates')
        ->assertForbidden();
});
