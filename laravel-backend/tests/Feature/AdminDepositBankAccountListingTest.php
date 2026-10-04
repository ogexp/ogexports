<?php

use App\Models\BankAccount;
use App\Models\Deposit;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->admin = User::factory()->create(['account_status' => 'active']);
    $this->admin->assignRole('admin');
});

it('includes admin bank account details on investor deposit listings', function () {
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    $bankAccount = BankAccount::query()->create([
        'bank_name' => 'Habib Bank Limited (HBL)',
        'account_title' => 'OG Exports (Private) Limited',
        'account_number' => '7234567890123456',
        'iban' => 'PK36HABB0000020003891069',
        'swift' => 'HABBPKKA',
        'currency' => 'USD',
        'is_active' => true,
        'is_default' => true,
    ]);

    $deposit = Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 500,
        'currency' => 'USD',
        'method' => 'bank_transfer',
        'reference' => 'DEP-BANK-1',
        'status' => 'pending',
        'bank_account_id' => $bankAccount->id,
        'bank_account_name' => $bankAccount->bank_name,
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/finance/deposits');

    $response->assertOk();

    $row = collect($response->json('data'))->firstWhere('id', $deposit->id);

    expect($row)->not->toBeNull()
        ->and($row['bank_account_id'])->toBe($bankAccount->id)
        ->and($row['bank_account_name'])->toBe('Habib Bank Limited (HBL)')
        ->and($row['admin_bank_account']['bank_name'])->toBe('Habib Bank Limited (HBL)')
        ->and($row['admin_bank_account']['account_number'])->toBe('7234567890123456');
});

it('falls back to bank_account_name when bank account relation is missing', function () {
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    $deposit = Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 250,
        'currency' => 'USD',
        'method' => 'bank_transfer',
        'reference' => 'DEP-BANK-LEGACY',
        'status' => 'pending',
        'bank_account_id' => null,
        'bank_account_name' => 'Legacy Snapshot Bank',
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/finance/deposits');

    $response->assertOk();

    $row = collect($response->json('data'))->firstWhere('id', $deposit->id);

    expect($row)->not->toBeNull()
        ->and($row['admin_bank_account']['bank_name'])->toBe('Legacy Snapshot Bank')
        ->and($row['admin_bank_account']['account_number'])->toBeNull();
});
