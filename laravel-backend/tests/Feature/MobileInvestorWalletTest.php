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

it('creates a USD wallet for a Pakistan-based investor when Profile currency is unset', function () {
    Http::fake([
        '*' => Http::response(['rates' => ['USD' => 1, 'PKR' => 277.2]], 200),
    ]);
    ExchangeRateService::clearCache();

    $profile = $this->investor->profile;
    $meta = is_array($profile->meta) ? $profile->meta : [];
    unset($meta['preferences']);
    $profile->update(['country' => 'Pakistan', 'meta' => $meta]);
    Wallet::query()->where('user_id', $this->investor->id)->delete();

    $token = $this->investor->createToken('wallet_country_default_test')->plainTextToken;
    $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/investor/wallet')
        ->assertOk()
        ->assertJsonPath('data.currency', 'USD')
        ->assertJsonPath('data.available_balance', 0);

    expect(Wallet::query()->where('user_id', $this->investor->id)->value('currency'))->toBe('USD');
});

it('changes Profile display currency without changing the USD wallet or transaction ledger', function () {
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

    $token = $this->investor->createToken('wallet_display_currency_test')->plainTextToken;
    $this->withHeader('Authorization', 'Bearer '.$token)
        ->putJson('/api/investor/profile', [
            'preferences' => ['currency' => 'EUR'],
        ])
        ->assertOk()
        ->assertJsonPath('data.preferences.currency', 'EUR')
        ->assertJsonMissingPath('wallet_currency_change');

    $wallet->refresh();
    $transaction->refresh();

    expect($wallet->currency)->toBe('USD')
        ->and((float) $wallet->available_balance)->toBe(10_000.0)
        ->and($transaction->meta['currency'] ?? null)->toBeNull()
        ->and($transaction->meta['note'] ?? null)->toBe('recorded before currency change')
        ->and(WalletCurrencyConversion::query()->where('wallet_id', $wallet->id)->exists())->toBeFalse();

    $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/investor/wallet/transactions')
        ->assertOk()
        ->assertJsonPath('data.0.currency', 'USD');
});

it('converts a legacy non-USD wallet to USD and preserves its historical transaction currency', function () {
    config(['currency.fallback_rates' => [
        'USD' => 1,
        'PKR' => 278.5,
        'EUR' => 0.92,
        'GBP' => 0.79,
    ]]);
    ExchangeRateService::clearCache();
    Http::fake(['*' => Http::response(null, 500)]);
    $wallet = Wallet::query()->where('user_id', $this->investor->id)->firstOrFail();
    $wallet->update([
        'currency' => 'PKR',
        'available_balance' => 27_850.0,
        'pending_balance' => 0,
    ]);
    $transaction = WalletTransaction::query()->create([
        'wallet_id' => $wallet->id,
        'type' => 'deposit',
        'amount' => 500,
        'direction' => 'credit',
        'reference' => 'OLD-PKR-LEDGER',
        'status' => 'completed',
        'meta' => ['note' => 'legacy PKR ledger entry'],
    ]);
    $transaction->forceFill(['meta' => ['note' => 'legacy PKR ledger entry']])->save();

    $this->artisan('wallets:normalize-usd', ['--apply' => true])
        ->assertExitCode(0);

    $wallet->refresh();
    $transaction->refresh();
    $conversion = WalletCurrencyConversion::query()->where('wallet_id', $wallet->id)->firstOrFail();

    expect($wallet->currency)->toBe('USD')
        ->and((float) $wallet->available_balance)->toBe(100.0)
        ->and($transaction->meta['currency'] ?? null)->toBe('PKR')
        ->and($transaction->meta['note'] ?? null)->toBe('legacy PKR ledger entry')
        ->and($conversion->from_currency)->toBe('PKR')
        ->and($conversion->to_currency)->toBe('USD')
        ->and((float) $conversion->from_amount)->toBe(27_850.0)
        ->and((float) $conversion->to_amount)->toBe(100.0)
        ->and($conversion->rates_as_of)->not->toBeNull();
});

it('reports a legacy conversion without changing the wallet unless apply is explicit', function () {
    config(['currency.fallback_rates' => [
        'USD' => 1,
        'PKR' => 278.5,
        'EUR' => 0.92,
        'GBP' => 0.79,
    ]]);
    ExchangeRateService::clearCache();
    Http::fake(['*' => Http::response(null, 500)]);
    $wallet = Wallet::query()->where('user_id', $this->investor->id)->firstOrFail();
    $wallet->update(['currency' => 'PKR', 'available_balance' => 27_850, 'pending_balance' => 0]);

    $this->artisan('wallets:normalize-usd')
        ->assertExitCode(0)
        ->expectsOutputToContain("Wallet {$wallet->id}: PKR 27850.00 → USD 100.00");

    expect($wallet->fresh()->currency)->toBe('PKR')
        ->and((float) $wallet->fresh()->available_balance)->toBe(27_850.0)
        ->and(WalletCurrencyConversion::query()->where('wallet_id', $wallet->id)->exists())->toBeFalse();
});

it('allows changing Profile display currency while a deposit is pending without changing wallet currency', function () {
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
        ->assertOk()
        ->assertJsonPath('data.preferences.currency', 'EUR');

    expect(Wallet::query()->where('user_id', $this->investor->id)->value('currency'))->toBe('USD');
});

it('skips converting a non-USD wallet with an unresolved deposit', function () {
    $wallet = Wallet::query()->where('user_id', $this->investor->id)->firstOrFail();
    $wallet->update(['currency' => 'PKR', 'available_balance' => 27_850, 'pending_balance' => 0]);
    Deposit::query()->create([
        'investor_id' => $this->investor->id,
        'amount' => 100,
        'currency' => 'USD',
        'method' => 'bank_transfer',
        'reference' => 'PENDING-DEPOSIT-NORMALIZATION',
        'status' => 'pending',
    ]);

    $this->artisan('wallets:normalize-usd', ['--apply' => true])
        ->assertExitCode(1)
        ->expectsOutputToContain("Wallet {$wallet->id} skipped: deposit is pending or unresolved.");

    expect($wallet->fresh()->currency)->toBe('PKR')
        ->and((float) $wallet->fresh()->available_balance)->toBe(27_850.0);
});

it('skips converting a non-USD wallet with an unresolved withdrawal', function () {
    $wallet = Wallet::query()->where('user_id', $this->investor->id)->firstOrFail();
    $wallet->update(['currency' => 'PKR', 'available_balance' => 27_850, 'pending_balance' => 0]);
    Withdrawal::query()->create([
        'investor_id' => $this->investor->id,
        'amount' => 100,
        'bank_details' => ['currency' => 'USD'],
        'reference' => 'PENDING-WITHDRAWAL',
        'status' => 'pending',
    ]);

    $this->artisan('wallets:normalize-usd', ['--apply' => true])
        ->assertExitCode(1)
        ->expectsOutputToContain("Wallet {$wallet->id} skipped: withdrawal is pending or under review.");

    expect($wallet->fresh()->currency)->toBe('PKR')
        ->and((float) $wallet->fresh()->available_balance)->toBe(27_850.0);
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
