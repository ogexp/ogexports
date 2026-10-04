<?php

use App\Models\Deposit;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Wallet;
use App\Models\Withdrawal;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

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

    UserProfile::query()->create([
        'user_id' => $this->investor->id,
        'country' => 'United Arab Emirates',
        'company_name' => 'Mobile Wallet Capital',
        'meta' => [
            'bank_accounts' => [
                [
                    'id' => 'bank-1',
                    'bank_name' => 'Emirates NBD',
                    'account_holder' => 'Mobile Wallet Investor',
                    'account_number' => '9876543210',
                    'iban' => 'AE070331234567890123456',
                    'swift' => 'EBILAEAD',
                    'branch' => 'Dubai',
                    'currency' => 'USD',
                    'is_default' => true,
                ],
            ],
        ],
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
        ->assertJsonPath('data.bank_details.account_number', '9876543210')
        ->assertJsonPath('data.bank_details.currency', 'USD');

    $withdrawal = Withdrawal::query()->where('investor_id', $this->investor->id)->firstOrFail();

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
        ->assertJsonValidationErrors(['bank_details']);
});
