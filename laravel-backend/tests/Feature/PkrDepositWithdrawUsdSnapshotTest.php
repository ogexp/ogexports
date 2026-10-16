<?php

use App\Models\Deposit;
use App\Models\InvestorBankAccountVerification;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Wallet;
use App\Models\Withdrawal;
use App\Support\ExchangeRateService;
use App\Support\InvestorBankAccountPresenter;
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

function enableWithdrawalAuth(User $user, array $bankDetails): void
{
    $user->forceFill([
        'transaction_password' => bcrypt('123456'),
        'transaction_password_set_at' => now(),
        'withdraw_otp_code' => bcrypt('123456'),
        'withdraw_otp_expires_at' => now()->addMinutes(10),
    ])->save();

    $account = [
        'id' => 'verified-withdrawal-account',
        'bank_name' => $bankDetails['bank_name'],
        'account_holder' => $bankDetails['account_holder'],
        'account_number' => $bankDetails['account_number'],
        'iban' => $bankDetails['iban'] ?? '',
        'swift' => $bankDetails['swift'] ?? '',
        'branch' => $bankDetails['branch'] ?? '',
        'currency' => $bankDetails['currency'] ?? 'USD',
        'is_default' => true,
    ];
    $profile = UserProfile::query()->where('user_id', $user->id)->firstOrFail();
    $profile->update(['meta' => ['bank_accounts' => [$account]]]);

    InvestorBankAccountVerification::query()->create([
        'investor_id' => $user->id,
        'bank_account_id' => $account['id'],
        'account_fingerprint' => InvestorBankAccountPresenter::fingerprint($account),
        'document_path' => 'test/verified-bank-proof.pdf',
        'original_name' => 'verified-bank-proof.pdf',
        'status' => 'verified',
        'reviewed_at' => now(),
    ]);
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

it('rejects withdrawals from a legacy PKR wallet until the server conversion completes', function () {
    $investor = pkrSnapshotInvestor();
    enableWithdrawalAuth($investor, [
        'bank_name' => 'HBL',
        'account_holder' => 'PK Investor',
        'account_number' => '1234567890',
        'currency' => 'PKR',
    ]);

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
        ->assertStatus(422)
        ->assertJsonValidationErrors(['amount'])
        ->assertJsonPath('errors.amount.0', 'Withdrawals are only available once your wallet has been converted to USD.');

    expect(Withdrawal::query()->where('investor_id', $investor->id)->count())->toBe(0)
        ->and((float) Wallet::query()->where('user_id', $investor->id)->value('available_balance'))->toBe(1_000_000.0);
});

it('rejects a PKR withdrawal before checking the payout size', function () {
    $investor = pkrSnapshotInvestor();
    enableWithdrawalAuth($investor, [
        'bank_name' => 'HBL',
        'account_holder' => 'PK Investor',
        'account_number' => '1234567890',
        'currency' => 'PKR',
    ]);

    $this->actingAs($investor)
        ->postJson('/api/investor/withdrawals', [
            'amount' => 27845,
            'bank_details' => [
                'bank_name' => 'HBL',
                'account_holder' => 'PK Investor',
                'account_number' => '1234567890',
                'currency' => 'PKR',
            ],
            'otp' => '123456',
            'transaction_password' => '123456',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['amount'])
        ->assertJsonPath('errors.amount.0', 'Withdrawals are only available once your wallet has been converted to USD.');

    expect(Withdrawal::query()->where('investor_id', $investor->id)->count())->toBe(0);
});

it('returns the USD 100 minimum payout in PKR wallet currency', function () {
    $investor = pkrSnapshotInvestor();

    $this->actingAs($investor)
        ->getJson('/api/investor/wallet')
        ->assertOk()
        ->assertJsonPath('data.minimum_withdrawal_amount', 27850)
        ->assertJsonPath('data.minimum_withdrawal_usd', 100)
        ->assertJsonPath('data.minimum_withdrawal_currency', 'PKR');
});

it('does not let submitted USD bank details bypass the PKR wallet restriction', function () {
    $investor = pkrSnapshotInvestor();
    enableWithdrawalAuth($investor, [
        'bank_name' => 'HBL',
        'account_holder' => 'PK Investor',
        'account_number' => '1234567890',
        'currency' => 'PKR',
    ]);

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
        ->assertStatus(422)
        ->assertJsonPath('errors.amount.0', 'Withdrawals are only available once your wallet has been converted to USD.');

    expect(Withdrawal::query()->where('investor_id', $investor->id)->count())->toBe(0);
});

it('does not store a USD snapshot when a non-Pakistani user withdraws', function () {
    $investor = usdSnapshotInvestor();
    enableWithdrawalAuth($investor, [
        'bank_name' => 'Test Bank',
        'account_holder' => 'Intl Investor',
        'account_number' => '9876543210',
        'currency' => 'USD',
    ]);

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
