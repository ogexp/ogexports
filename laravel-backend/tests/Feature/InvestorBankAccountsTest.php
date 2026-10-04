<?php

use App\Models\User;
use App\Models\UserProfile;
use App\Models\PlatformSetting;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

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
