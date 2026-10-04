<?php

use App\Models\Deposit;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Wallet;
use App\Models\Withdrawal;
use App\Support\ExchangeRateService;
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
});

function pkrSnapshotInvestor(float $balance = 1_000_000): User
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
        'available_balance' => $balance,
        'pending_balance' => 0,
    ]);

    return $investor;
}

function usdSnapshotInvestor(float $balance = 50_000): User
{
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    UserProfile::query()->create([
        'user_id' => $investor->id,
        'country' => 'United Arab Emirates',
    ]);

    Wallet::query()->create([
        'user_id' => $investor->id,
        'currency' => 'USD',
        'available_balance' => $balance,
        'pending_balance' => 0,
    ]);

    return $investor;
}

function enableWithdrawalAuth(User $user): void
{
    $user->forceFill([
        'transaction_password' => bcrypt('123456'),
        'transaction_password_set_at' => now(),
        'withdraw_otp_code' => bcrypt('123456'),
        'withdraw_otp_expires_at' => now()->addMinutes(10),
    ])->save();
}

it('stores USD amount and PKR-per-USD rate when a Pakistani user deposits PKR', function () {
    $investor = pkrSnapshotInvestor();

    $this->actingAs($investor)
        ->postJson('/api/investor/deposits', [
            'amount' => 27850,
            'currency' => 'PKR',
            'method' => 'bank_transfer',
        ])
        ->assertCreated()
        ->assertJsonPath('data.amount_usd', '100.00')
        ->assertJsonPath('data.usd_exchange_rate', '278.50000000');

    $deposit = Deposit::query()->where('investor_id', $investor->id)->firstOrFail();

    expect((float) $deposit->amount)->toBe(27850.0)
        ->and($deposit->currency)->toBe('PKR')
        ->and((float) $deposit->amount_usd)->toBe(100.0)
        ->and((float) $deposit->usd_exchange_rate)->toBe(278.5);
});

it('does not store a USD snapshot for a Pakistani user depositing a non-PKR currency', function () {
    $investor = pkrSnapshotInvestor();

    $this->actingAs($investor)
        ->postJson('/api/investor/deposits', [
            'amount' => 100,
            'currency' => 'USD',
            'method' => 'bank_transfer',
        ])
        ->assertCreated();

    $deposit = Deposit::query()->where('investor_id', $investor->id)->firstOrFail();

    expect($deposit->amount_usd)->toBeNull()
        ->and($deposit->usd_exchange_rate)->toBeNull();
});

it('does not store a USD snapshot when a non-Pakistani user deposits', function () {
    $investor = usdSnapshotInvestor();

    $this->actingAs($investor)
        ->postJson('/api/investor/deposits', [
            'amount' => 500,
            'currency' => 'USD',
            'method' => 'bank_transfer',
        ])
        ->assertCreated();

    $deposit = Deposit::query()->where('investor_id', $investor->id)->firstOrFail();

    expect($deposit->amount_usd)->toBeNull()
        ->and($deposit->usd_exchange_rate)->toBeNull();
});

it('stores USD amount and PKR-per-USD rate when a Pakistani user withdraws', function () {
    $investor = pkrSnapshotInvestor();
    enableWithdrawalAuth($investor);

    $this->actingAs($investor)
        ->postJson('/api/investor/withdrawals', [
            'amount' => 27850,
            'bank_details' => [
                'bank_name' => 'HBL',
                'account_holder' => 'PK Investor',
                'account_number' => '1234567890',
                'currency' => 'PKR',
            ],
            'otp' => '123456',
            'transaction_password' => '123456',
        ])
        ->assertCreated()
        ->assertJsonPath('data.amount_usd', 100)
        ->assertJsonPath('data.exchange_rate', 278.5);

    $withdrawal = Withdrawal::query()->where('investor_id', $investor->id)->firstOrFail();

    expect((float) $withdrawal->amount)->toBe(27850.0)
        ->and((float) $withdrawal->amount_usd)->toBe(100.0)
        ->and((float) $withdrawal->exchange_rate)->toBe(278.5);
});

it('overwrites submitted bank currency with wallet currency for Pakistani withdrawals', function () {
    $investor = pkrSnapshotInvestor();
    enableWithdrawalAuth($investor);

    $this->actingAs($investor)
        ->postJson('/api/investor/withdrawals', [
            'amount' => 27850,
            'bank_details' => [
                'bank_name' => 'HBL',
                'account_holder' => 'PK Investor',
                'account_number' => '1234567890',
                'currency' => 'USD',
            ],
            'otp' => '123456',
            'transaction_password' => '123456',
        ])
        ->assertCreated();

    $withdrawal = Withdrawal::query()->where('investor_id', $investor->id)->firstOrFail();
    $bankDetails = is_array($withdrawal->bank_details) ? $withdrawal->bank_details : [];

    expect(strtoupper((string) ($bankDetails['currency'] ?? '')))->toBe('PKR')
        ->and((float) $withdrawal->amount)->toBe(27850.0)
        ->and((float) $withdrawal->amount_usd)->toBe(100.0);
});

it('does not store a USD snapshot when a non-Pakistani user withdraws', function () {
    $investor = usdSnapshotInvestor();
    enableWithdrawalAuth($investor);

    $this->actingAs($investor)
        ->postJson('/api/investor/withdrawals', [
            'amount' => 500,
            'bank_details' => [
                'bank_name' => 'Test Bank',
                'account_holder' => 'Intl Investor',
                'account_number' => '9876543210',
                'currency' => 'USD',
            ],
            'otp' => '123456',
            'transaction_password' => '123456',
        ])
        ->assertCreated();

    $withdrawal = Withdrawal::query()->where('investor_id', $investor->id)->firstOrFail();

    expect($withdrawal->amount_usd)->toBeNull()
        ->and($withdrawal->exchange_rate)->toBeNull();
});

it('preserves submission-time USD snapshot when a PKR deposit is approved', function () {
    $investor = pkrSnapshotInvestor();
    $admin = User::factory()->create(['account_status' => 'active']);
    $admin->assignRole('admin');

    $this->actingAs($investor)
        ->postJson('/api/investor/deposits', [
            'amount' => 27850,
            'currency' => 'PKR',
            'method' => 'bank_transfer',
        ])
        ->assertCreated();

    $deposit = Deposit::query()->where('investor_id', $investor->id)->firstOrFail();
    expect((float) $deposit->usd_exchange_rate)->toBe(278.5)
        ->and((float) $deposit->amount_usd)->toBe(100.0)
        ->and((float) $deposit->exchange_rate)->toBe(278.5);

    // Change live fallback so approval must not overwrite locked snapshot.
    config(['currency.fallback_rates.PKR' => 300.0]);
    ExchangeRateService::clearCache();

    $this->actingAs($admin)
        ->postJson("/api/admin/finance/deposits/{$deposit->id}/approve")
        ->assertOk();

    $deposit->refresh();

    expect((float) $deposit->usd_exchange_rate)->toBe(278.5)
        ->and((float) $deposit->amount_usd)->toBe(100.0)
        ->and($deposit->status)->toBe('approved');
});

it('backfills USD snapshot on approval when a legacy PKR deposit has none', function () {
    $investor = pkrSnapshotInvestor();
    $admin = User::factory()->create(['account_status' => 'active']);
    $admin->assignRole('admin');

    $deposit = Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 55700,
        'currency' => 'PKR',
        'method' => 'bank_transfer',
        'status' => 'pending',
        'amount_usd' => null,
        'usd_exchange_rate' => null,
    ]);

    $this->actingAs($admin)
        ->postJson("/api/admin/finance/deposits/{$deposit->id}/approve")
        ->assertOk();

    $deposit->refresh();

    expect((float) $deposit->usd_exchange_rate)->toBe(278.5)
        ->and((float) $deposit->amount_usd)->toBe(200.0)
        ->and($deposit->status)->toBe('approved');
});
