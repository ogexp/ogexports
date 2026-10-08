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

it('stores USD amount and PKR-per-USD rate when a Pakistani user withdraws', function () {
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
        ->assertCreated()
        ->assertJsonPath('data.amount_usd', 100)
        ->assertJsonPath('data.exchange_rate', 278.5)
        ->assertJsonPath('data.fee', 557)
        ->assertJsonPath('data.fee_usd', 2)
        ->assertJsonPath('data.total_debit', 28407)
        ->assertJsonPath('data.total_debit_usd', 102)
        ->assertJsonPath('data.payment_method', 'Bank Transfer');

    $withdrawal = Withdrawal::query()->where('investor_id', $investor->id)->firstOrFail();

    expect((float) $withdrawal->amount)->toBe(27850.0)
        ->and((float) $withdrawal->amount_usd)->toBe(100.0)
        ->and((float) $withdrawal->exchange_rate)->toBe(278.5)
        ->and((float) $withdrawal->fee)->toBe(557.0)
        ->and((float) $withdrawal->fee_usd)->toBe(2.0)
        ->and((float) $withdrawal->total_debit)->toBe(28407.0)
        ->and((float) $withdrawal->total_debit_usd)->toBe(102.0)
        ->and($withdrawal->bank_details['payment_method'])->toBe('Bank Transfer');

    $transaction = \App\Models\WalletTransaction::query()
        ->where('meta->withdrawal_id', $withdrawal->id)
        ->firstOrFail();
    expect($transaction->meta['payment_method'])->toBe('Bank Transfer')
        ->and((float) $transaction->meta['exchange_rate'])->toBe(278.5);

    $this->actingAs($investor)
        ->getJson("/api/investor/wallet/transactions/{$transaction->id}")
        ->assertOk()
        ->assertJsonPath('data.withdrawal_breakdown.payout_amount', 27850)
        ->assertJsonPath('data.withdrawal_breakdown.payout_amount_usd', 100)
        ->assertJsonPath('data.withdrawal_breakdown.fee', 557)
        ->assertJsonPath('data.withdrawal_breakdown.fee_usd', 2)
        ->assertJsonPath('data.withdrawal_breakdown.total_debit', 28407)
        ->assertJsonPath('data.withdrawal_breakdown.total_debit_usd', 102)
        ->assertJsonPath('data.withdrawal_breakdown.currency', 'PKR')
        ->assertJsonPath('data.withdrawal_breakdown.exchange_rate', 278.5)
        ->assertJsonPath('data.meta.payment_method', 'Bank Transfer');

    $receiptHtml = view('pdf.withdrawal-receipt', [
        'withdrawal' => $withdrawal,
        'withdrawalBreakdown' => \App\Support\InvestorWithdrawalBreakdown::fromWithdrawal($withdrawal, $transaction),
        'user' => $investor,
        'generatedAt' => now()->format('d M Y H:i'),
    ])->render();

    expect($receiptHtml)
        ->toContain('PKR 27,850.00')
        ->toContain('USD 100.00')
        ->toContain('PKR 557.00 (USD 2.00)')
        ->toContain('PKR 28,407.00 (USD 102.00)')
        ->toContain('1 USD = 278.50000000 PKR');
});

it('rejects a PKR payout below the USD 100 minimum at the request rate', function () {
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
        ->assertJsonPath('errors.amount.0', 'The payout amount must be at least USD 100.00. The withdrawal fee is added separately.');

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

it('overwrites submitted bank currency with wallet currency for Pakistani withdrawals', function () {
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
        ->assertCreated();

    $withdrawal = Withdrawal::query()->where('investor_id', $investor->id)->firstOrFail();
    $bankDetails = is_array($withdrawal->bank_details) ? $withdrawal->bank_details : [];

    expect(strtoupper((string) ($bankDetails['currency'] ?? '')))->toBe('PKR')
        ->and((float) $withdrawal->amount)->toBe(27850.0)
        ->and((float) $withdrawal->amount_usd)->toBe(100.0);
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
