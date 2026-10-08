<?php

use App\Models\Deposit;
use App\Models\User;
use App\Models\InvestorBankAccountVerification;
use App\Models\UserProfile;
use App\Models\Wallet;
use App\Models\WalletCurrencyConversion;
use App\Models\WalletTransaction;
use App\Models\Withdrawal;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use App\Support\InvestorBankAccountPresenter;
use App\Support\ExchangeRateService;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->investor = User::factory()->create([
        'name' => 'Mobile Wallet Investor',
        'email' => 'mobile.wallet@example.com',
        'password' => Hash::make('Password1!'),
        'account_status' => 'active',
        'email_verified_at' => now(),
    ]);
    $this->investor->assignRole('investor');

    $this->bankAccount = [
        'id' => 'bank-1',
        'bank_name' => 'Emirates NBD',
        'account_holder' => 'Mobile Wallet Investor',
        'account_number' => '9876543210',
        'iban' => 'AE070331234567890123456',
        'swift' => 'EBILAEAD',
        'branch' => 'Dubai',
        'currency' => 'USD',
        'is_default' => true,
    ];

    UserProfile::query()->create([
        'user_id' => $this->investor->id,
        'country' => 'United Arab Emirates',
        'company_name' => 'Mobile Wallet Capital',
        'meta' => ['bank_accounts' => [$this->bankAccount]],
    ]);

    InvestorBankAccountVerification::query()->create([
        'investor_id' => $this->investor->id,
        'bank_account_id' => $this->bankAccount['id'],
        'account_fingerprint' => InvestorBankAccountPresenter::fingerprint($this->bankAccount),
        'document_path' => 'test/verified-bank-proof.pdf',
        'original_name' => 'verified-bank-proof.pdf',
        'status' => 'verified',
        'reviewed_at' => now(),
    ]);

    Wallet::query()->create([
        'user_id' => $this->investor->id,
        'currency' => 'USD',
        'available_balance' => 10_000,
        'pending_balance' => 0,
    ]);
});

it('preserves an existing USD wallet when reading it for a Pakistan-based investor', function () {
    Http::fake([
        '*' => Http::response(['rates' => ['USD' => 1, 'PKR' => 277.2]], 200),
    ]);

    $this->investor->profile->update(['country' => 'Pakistan']);
    $wallet = Wallet::query()->where('user_id', $this->investor->id)->firstOrFail();
    $wallet->update(['available_balance' => 1150.33]);
    $token = $this->investor->createToken('wallet_currency_test')->plainTextToken;

    $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/investor/wallet')
        ->assertOk()
        ->assertJsonPath('data.currency', 'USD')
        ->assertJsonPath('data.available_balance', 1150.33);

    expect($wallet->fresh()->currency)->toBe('USD')
        ->and((float) $wallet->fresh()->available_balance)->toBe(1150.33);

    $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/investor/dashboard')
        ->assertOk()
        ->assertJsonPath('data.wallet.currency', 'USD')
        ->assertJsonPath('data.summary.available_balance', 1150.33);
});

it('converts the wallet balance and preserves historical transaction currency when Profile currency changes', function () {
    config(['currency.fallback_rates' => [
        'USD' => 1,
        'PKR' => 278.5,
        'EUR' => 0.92,
        'GBP' => 0.79,
    ]]);
    ExchangeRateService::clearCache();
    Http::fake(['*' => Http::response(null, 500)]);

    $wallet = Wallet::query()->where('user_id', $this->investor->id)->firstOrFail();
    $transaction = WalletTransaction::query()->create([
        'wallet_id' => $wallet->id,
        'type' => 'deposit',
        'amount' => 250,
        'direction' => 'credit',
        'reference' => 'OLD-USD-LEDGER',
        'status' => 'completed',
        'meta' => ['note' => 'recorded before currency change'],
    ]);
    $transaction->forceFill(['meta' => ['note' => 'recorded before currency change']])->save();

    $token = $this->investor->createToken('wallet_currency_conversion_test')->plainTextToken;
    $this->withHeader('Authorization', 'Bearer '.$token)
        ->putJson('/api/investor/profile', [
            'preferences' => ['currency' => 'EUR'],
        ])
        ->assertOk()
        ->assertJsonPath('wallet_currency_change.from_currency', 'USD')
        ->assertJsonPath('wallet_currency_change.to_currency', 'EUR');

    $wallet->refresh();
    $transaction->refresh();
    $conversion = WalletCurrencyConversion::query()->where('wallet_id', $wallet->id)->firstOrFail();

    expect($wallet->currency)->toBe('EUR')
        ->and((float) $wallet->available_balance)->toBe(9200.0)
        ->and($transaction->meta['currency'] ?? null)->toBe('USD')
        ->and($transaction->meta['note'] ?? null)->toBe('recorded before currency change')
        ->and($conversion->from_currency)->toBe('USD')
        ->and($conversion->to_currency)->toBe('EUR')
        ->and((float) $conversion->from_amount)->toBe(10000.0)
        ->and((float) $conversion->to_amount)->toBe(9200.0)
        ->and((float) $conversion->exchange_rate)->toBe(0.92)
        ->and($conversion->rates_as_of)->not->toBeNull();

    $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/investor/wallet/transactions')
        ->assertOk()
        ->assertJsonPath('data.0.currency', 'USD');
});

it('blocks Profile currency changes while a deposit is pending', function () {
    Deposit::query()->create([
        'investor_id' => $this->investor->id,
        'amount' => 100,
        'currency' => 'USD',
        'method' => 'bank_transfer',
        'reference' => 'PENDING-DEPOSIT',
        'status' => 'pending',
    ]);

    $token = $this->investor->createToken('pending_deposit_currency_test')->plainTextToken;
    $this->withHeader('Authorization', 'Bearer '.$token)
        ->putJson('/api/investor/profile', [
            'preferences' => ['currency' => 'EUR'],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['preferences.currency']);

    expect(Wallet::query()->where('user_id', $this->investor->id)->value('currency'))->toBe('USD');
});

it('blocks Profile currency changes while a withdrawal is pending', function () {
    Withdrawal::query()->create([
        'investor_id' => $this->investor->id,
        'amount' => 100,
        'bank_details' => ['currency' => 'USD'],
        'reference' => 'PENDING-WITHDRAWAL',
        'status' => 'pending',
    ]);

    $token = $this->investor->createToken('pending_withdrawal_currency_test')->plainTextToken;
    $this->withHeader('Authorization', 'Bearer '.$token)
        ->putJson('/api/investor/profile', [
            'preferences' => ['currency' => 'EUR'],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['preferences.currency']);

    expect(Wallet::query()->where('user_id', $this->investor->id)->value('currency'))->toBe('USD');
});

it('accepts a mobile deposit without currency and defaults to wallet currency', function () {
    $token = $this->investor->createToken('flutter_test')->plainTextToken;

    $this->withHeader('Authorization', 'Bearer '.$token)
        ->postJson('/api/investor/deposits', [
            'amount' => 250,
            'reference' => 'MOBILE-REF-1',
        ])
        ->assertCreated()
        ->assertJsonPath('data.currency', 'USD')
        ->assertJsonPath('data.amount', '250.00');

    $deposit = Deposit::query()->where('investor_id', $this->investor->id)->firstOrFail();

    expect($deposit->currency)->toBe('USD')
        ->and((float) $deposit->amount)->toBe(250.0)
        ->and($deposit->bank_reference)->toBe('MOBILE-REF-1');
});

it('accepts a mobile withdrawal without bank_details using profile default bank', function () {
    $this->investor->forceFill([
        'transaction_password' => bcrypt('123456'),
        'transaction_password_set_at' => now(),
        'withdraw_otp_code' => bcrypt('123456'),
        'withdraw_otp_expires_at' => now()->addMinutes(10),
    ])->save();

    $token = $this->investor->createToken('flutter_test')->plainTextToken;

    $this->withHeader('Authorization', 'Bearer '.$token)
        ->postJson('/api/investor/withdrawals', [
            'amount' => 100,
            'otp' => '123456',
            'transaction_password' => '123456',
        ])
        ->assertCreated()
        ->assertJsonPath('data.bank_details.bank_name', 'Emirates NBD')
        ->assertJsonPath('data.bank_details.masked_account_identifier', '•••• 3210')
        ->assertJsonMissingPath('data.bank_details.account_number')
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.bank_details.currency', 'USD');

    $withdrawal = Withdrawal::query()->where('investor_id', $this->investor->id)->firstOrFail();
    $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/investor/withdrawals')
        ->assertOk()
        ->assertJsonPath('data.0.reference', $withdrawal->reference)
        ->assertJsonPath('data.0.status', 'pending');

    expect((float) $withdrawal->amount)->toBe(100.0)
        ->and($withdrawal->bank_details['bank_name'] ?? null)->toBe('Emirates NBD');
});

it('rejects a mobile withdrawal without bank_details when no profile bank is set', function () {
    $this->investor->profile->update(['meta' => []]);

    $this->investor->forceFill([
        'transaction_password' => bcrypt('123456'),
        'transaction_password_set_at' => now(),
        'withdraw_otp_code' => bcrypt('123456'),
        'withdraw_otp_expires_at' => now()->addMinutes(10),
    ])->save();

    $token = $this->investor->createToken('flutter_test')->plainTextToken;

    $this->withHeader('Authorization', 'Bearer '.$token)
        ->postJson('/api/investor/withdrawals', [
            'amount' => 100,
            'otp' => '123456',
            'transaction_password' => '123456',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['bank_account_id']);
});
