<?php

use App\Models\Deposit;
use App\Models\AppNotification;
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
});

it('stores deposit in the submitted original currency', function () {
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');
    UserProfile::query()->create([
        'user_id' => $investor->id,
        'country' => 'Pakistan',
    ]);

    $this->actingAs($investor)
        ->postJson('/api/investor/deposits', [
            'amount' => 100,
            'currency' => 'USD',
            'method' => 'Bank Transfer',
            'reference' => 'DEP-PK-USD-1',
        ])
        ->assertCreated()
        ->assertJsonPath('data.currency', 'USD')
        ->assertJsonPath('data.amount', '100.00');

    $deposit = Deposit::query()->where('investor_id', $investor->id)->first();
    $notification = AppNotification::query()
        ->where('user_id', $investor->id)
        ->where('type', 'deposit_submitted')
        ->sole();

    expect($deposit->currency)->toBe('USD')
        ->and($notification->body)->toContain('submitted for review')
        ->and($notification->body)->toContain('not been approved or credited')
        ->and($notification->data['deposit_id'])->toBe($deposit->id)
        ->and($notification->data['transaction_status'])->toBe('pending')
        ->and($notification->data['href'])->toBe("/invest/transactions/deposit/{$deposit->id}");
});

it('requires a supported currency on deposit submit', function () {
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');
    UserProfile::query()->create(['user_id' => $investor->id, 'country' => 'United Kingdom']);

    $this->actingAs($investor)
        ->postJson('/api/investor/deposits', [
            'amount' => 100,
            'currency' => 'JPY',
            'method' => 'Bank Transfer',
        ])
        ->assertStatus(422);
});

it('converts USD deposit to PKR wallet on approval for pakistan investors', function () {
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');
    UserProfile::query()->create([
        'user_id' => $investor->id,
        'country' => 'Pakistan',
    ]);

    $deposit = Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 100,
        'currency' => 'USD',
        'method' => 'Bank Transfer',
        'reference' => 'DEP-CONVERT-1',
        'status' => 'pending',
    ]);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/finance/deposits/{$deposit->id}/approve")
        ->assertOk()
        ->assertJsonPath('data.status', 'approved');

    $wallet = Wallet::query()->where('user_id', $investor->id)->first();
    expect((float) $wallet->available_balance)->toBe(27850.0)
        ->and($wallet->currency)->toBe('PKR');

    $deposit->refresh();
    $notification = AppNotification::query()
        ->where('user_id', $investor->id)
        ->where('type', 'deposit_approved')
        ->sole();
    expect((float) $deposit->converted_amount)->toBe(27850.0)
        ->and($deposit->wallet_currency)->toBe('PKR')
        ->and($deposit->exchange_rate)->not->toBeNull()
        ->and($notification->data['transaction_status'])->toBe('approved')
        ->and($notification->data['href'])->toBe("/invest/transactions/deposit/{$deposit->id}")
        ->and($notification->body)->toContain('credited to your wallet');
});

it('converts GBP deposit to USD wallet on approval for international investors', function () {
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');
    UserProfile::query()->create([
        'user_id' => $investor->id,
        'country' => 'United Arab Emirates',
    ]);

    $deposit = Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 500,
        'currency' => 'GBP',
        'method' => 'Bank Transfer',
        'reference' => 'DEP-CONVERT-2',
        'status' => 'pending',
    ]);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/finance/deposits/{$deposit->id}/approve")
        ->assertOk();

    $wallet = Wallet::query()->where('user_id', $investor->id)->first();
    expect((float) $wallet->available_balance)->toBe(632.91)
        ->and($wallet->currency)->toBe('USD');
});

it('returns wallet balance and deposit breakdown from wallet API', function () {
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');
    UserProfile::query()->create([
        'user_id' => $investor->id,
        'country' => 'Pakistan',
    ]);

    Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 100,
        'currency' => 'USD',
        'converted_amount' => 27850,
        'exchange_rate' => 278.5,
        'wallet_currency' => 'PKR',
        'method' => 'Bank Transfer',
        'reference' => 'DEP-APPROVED-1',
        'status' => 'approved',
    ]);

    Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 50000,
        'currency' => 'PKR',
        'converted_amount' => 50000,
        'exchange_rate' => 1,
        'wallet_currency' => 'PKR',
        'method' => 'Bank Transfer',
        'reference' => 'DEP-APPROVED-2',
        'status' => 'approved',
    ]);

    Wallet::query()->create([
        'user_id' => $investor->id,
        'currency' => 'PKR',
        'available_balance' => 77850,
        'pending_balance' => 0,
    ]);

    $this->actingAs($investor)
        ->getJson('/api/investor/wallet')
        ->assertOk()
        ->assertJsonPath('data.currency', 'PKR')
        ->assertJsonPath('data.available_balance', 77850)
        ->assertJsonFragment(['currency' => 'USD', 'original_total' => 100, 'converted_total' => 27850])
        ->assertJsonFragment(['currency' => 'PKR', 'original_total' => 50000, 'converted_total' => 50000]);
});

it('rejects and cancels pending investor deposits', function () {
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    $reject = Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 800,
        'currency' => 'USD',
        'method' => 'Wire Transfer',
        'reference' => 'DEP-TEST-2',
        'status' => 'pending',
    ]);
    $cancel = Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 900,
        'currency' => 'USD',
        'method' => 'Wire Transfer',
        'reference' => 'DEP-TEST-3',
        'status' => 'pending',
    ]);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/finance/deposits/{$reject->id}/reject")
        ->assertOk()
        ->assertJsonPath('data.status', 'rejected');

    $this->actingAs($this->admin)
        ->postJson("/api/admin/finance/deposits/{$cancel->id}/cancel")
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled');

    $rejectedNotification = AppNotification::query()
        ->where('user_id', $investor->id)
        ->where('type', 'deposit_rejected')
        ->sole();
    $cancelledNotification = AppNotification::query()
        ->where('user_id', $investor->id)
        ->where('type', 'deposit_cancelled')
        ->sole();

    expect($rejectedNotification->data['transaction_status'])->toBe('rejected')
        ->and($rejectedNotification->body)->toContain('No wallet credit was recorded')
        ->and($rejectedNotification->data['href'])->toBe("/invest/transactions/deposit/{$reject->id}")
        ->and($cancelledNotification->data['transaction_status'])->toBe('cancelled')
        ->and($cancelledNotification->data['href'])->toBe("/invest/transactions/deposit/{$cancel->id}");
});

it('approves investor deposit once and prevents double credit', function () {
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');
    UserProfile::query()->create([
        'user_id' => $investor->id,
        'country' => 'Pakistan',
    ]);

    $deposit = Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 28000,
        'currency' => 'PKR',
        'method' => 'Bank Transfer',
        'reference' => 'DEP-TEST-1',
        'status' => 'pending',
    ]);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/finance/deposits/{$deposit->id}/approve")
        ->assertOk();

    $wallet = Wallet::query()->where('user_id', $investor->id)->first();
    expect((float) $wallet->available_balance)->toBe(28000.0)
        ->and($wallet->currency)->toBe('PKR');

    $this->actingAs($this->admin)
        ->postJson("/api/admin/finance/deposits/{$deposit->id}/approve")
        ->assertStatus(422);
});
