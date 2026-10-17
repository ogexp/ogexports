<?php

use App\Models\User;
use App\Models\InvestorBankAccountVerification;
use App\Models\PlatformSetting;
use App\Models\UserProfile;
use App\Models\Wallet;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

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

    $this->investor = User::factory()->create(['account_status' => 'active']);
    $this->investor->assignRole('investor');
});

afterEach(function () {
    if (isset($this->proofPath)) {
        Storage::disk('local')->delete($this->proofPath);
    }
});

it('returns migrated bank_accounts from legacy withdraw_bank on profile show', function () {
    UserProfile::query()->create([
        'user_id' => $this->investor->id,
        'country' => 'Pakistan',
        'meta' => [
            'withdraw_bank' => [
                'bank_name' => 'HBL',
                'account_holder' => 'Demo Investor',
                'account_number' => '12345678',
                'iban' => 'PK00TEST',
                'swift' => 'HABBPKKA',
                'branch' => 'Lahore',
                'currency' => 'PKR',
            ],
        ],
    ]);

    $this->actingAs($this->investor)
        ->getJson('/api/investor/profile')
        ->assertOk()
        ->assertJsonPath('data.bank_accounts.0.bank_name', 'HBL')
        ->assertJsonPath('data.bank_accounts.0.account_number', '12345678')
        ->assertJsonPath('data.bank_accounts.0.is_default', true)
        ->assertJsonPath('data.default_bank_account.bank_name', 'HBL');
});

it('keeps the stored USD wallet and balance when profile country changes', function () {
    UserProfile::query()->create([
        'user_id' => $this->investor->id,
        'country' => 'United Arab Emirates',
        'meta' => [],
    ]);
    Wallet::query()->create([
        'user_id' => $this->investor->id,
        'currency' => 'USD',
        'available_balance' => 1250,
        'pending_balance' => 50,
    ]);

    $this->actingAs($this->investor)
        ->putJson('/api/investor/profile', ['country' => 'Pakistan'])
        ->assertOk()
        ->assertJsonPath('data.address.country', 'Pakistan');

    $wallet = Wallet::query()->where('user_id', $this->investor->id)->firstOrFail();
    expect($wallet->currency)->toBe('USD')
        ->and((float) $wallet->available_balance)->toBe(1250.0)
        ->and((float) $wallet->pending_balance)->toBe(50.0);
});

it('saves multiple bank_accounts and keeps a single default', function () {
    UserProfile::query()->create([
        'user_id' => $this->investor->id,
        'country' => 'Pakistan',
        'meta' => [],
    ]);

    $this->actingAs($this->investor)
        ->putJson('/api/investor/profile', [
            'bank_accounts' => [
                [
                    'id' => 'a1',
                    'bank_name' => 'HBL',
                    'account_holder' => 'One',
                    'account_number' => '111',
                    'currency' => 'PKR',
                    'is_default' => false,
                ],
                [
                    'id' => 'a2',
                    'bank_name' => 'UBL',
                    'account_holder' => 'Two',
                    'account_number' => '222',
                    'currency' => 'PKR',
                    'is_default' => true,
                ],
            ],
        ])
        ->assertOk()
        ->assertJsonPath('data.default_bank_account.id', 'a2')
        ->assertJsonPath('data.bank_accounts.1.is_default', true)
        ->assertJsonPath('data.withdraw_bank.bank_name', 'UBL');

    $meta = $this->investor->fresh()->profile->meta;
    expect($meta['bank_accounts'])->toHaveCount(2)
        ->and($meta['withdraw_bank']['account_number'])->toBe('222');
});

it('accepts multipart bank proof uploads and stores the proof privately', function () {
    $this->actingAs($this->investor)
        ->post('/api/investor/bank-accounts', [
            'bank_name' => 'Habib Bank',
            'account_holder' => 'Demo Investor',
            'account_number' => '1234567890',
            'currency' => 'PKR',
            'file' => UploadedFile::fake()->create('statement.pdf', 100, 'application/pdf'),
        ], [
            'Accept' => 'application/json',
        ])
        ->assertCreated()
        ->assertJsonPath('message', 'Bank account proof submitted for review.');

    $verification = InvestorBankAccountVerification::query()
        ->where('investor_id', $this->investor->id)
        ->firstOrFail();
    $this->proofPath = $verification->document_path;

    expect($verification->original_name)->toBe('statement.pdf')
        ->and($verification->status)->toBe('pending');

    expect(Storage::disk('local')->exists($verification->document_path))->toBeTrue();
});

it('rejects bank proof files larger than 10mb before storing them', function () {
    $filesBefore = Storage::disk('local')->allFiles('bank-account-proofs/'.$this->investor->id);

    $this->actingAs($this->investor)
        ->post('/api/investor/bank-accounts', [
            'bank_name' => 'Habib Bank',
            'account_holder' => 'Demo Investor',
            'account_number' => '1234567890',
            'currency' => 'PKR',
            'file' => UploadedFile::fake()->create('large.pdf', 10 * 1024 + 1, 'application/pdf'),
        ], [
            'Accept' => 'application/json',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('file');

    expect(InvestorBankAccountVerification::query()->where('investor_id', $this->investor->id)->exists())
        ->toBeFalse();
    expect(Storage::disk('local')->allFiles('bank-account-proofs/'.$this->investor->id))
        ->toBe($filesBefore);
});
