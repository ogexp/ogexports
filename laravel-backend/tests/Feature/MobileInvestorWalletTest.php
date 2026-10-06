<?php

use App\Models\Deposit;
use App\Models\User;
use App\Models\InvestorBankAccountVerification;
use App\Models\UserProfile;
use App\Models\Wallet;
use App\Models\Withdrawal;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use App\Support\InvestorBankAccountPresenter;

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
