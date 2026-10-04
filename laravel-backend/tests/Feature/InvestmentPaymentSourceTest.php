<?php

use App\Models\Deposit;
use App\Models\Investment;
use App\Models\InvestmentProject;
use App\Models\User;
use App\Support\InvestmentPaymentSource;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->investor = User::factory()->create(['account_status' => 'active']);
    $this->investor->assignRole('investor');

    $this->project = InvestmentProject::query()->create([
        'title' => 'Payment Source Test',
        'type' => 'container',
        'status' => 'funding',
        'target_amount' => 10000,
        'raised_amount' => 0,
        'investors_count' => 0,
        'min_investment' => 100,
        'expected_return_pct' => 8,
    ]);
});

it('normalizes deposit method labels to canonical payment sources', function () {
    expect(InvestmentPaymentSource::normalize('Bank Transfer'))->toBe(InvestmentPaymentSource::BANK_TRANSFER)
        ->and(InvestmentPaymentSource::normalize('online'))->toBe(InvestmentPaymentSource::ONLINE_BANKING)
        ->and(InvestmentPaymentSource::label(InvestmentPaymentSource::WALLET))->toBe('OG Wallet');
});

it('returns approved deposits within lookback as wallet funding context', function () {
    $investment = Investment::query()->create([
        'project_id' => $this->project->id,
        'investor_id' => $this->investor->id,
        'amount' => 1000,
        'status' => 'active',
        'payment_source' => InvestmentPaymentSource::WALLET,
        'reference' => 'INV-99',
        'invested_at' => now(),
        'approved_at' => now(),
    ]);

    Deposit::query()->create([
        'investor_id' => $this->investor->id,
        'amount' => 3000,
        'currency' => 'USD',
        'method' => 'Online Banking',
        'reference' => 'DEP-ONLINE-1',
        'status' => 'approved',
        'reviewed_at' => now()->subDays(2),
    ]);

    Deposit::query()->create([
        'investor_id' => $this->investor->id,
        'amount' => 2000,
        'currency' => 'USD',
        'method' => 'wire',
        'reference' => 'DEP-WIRE-1',
        'status' => 'approved',
        'reviewed_at' => now()->subDays(5),
    ]);

    $funding = InvestmentPaymentSource::walletFundingDeposits($investment);

    expect($funding)->toHaveCount(2)
        ->and($funding[0]['method_label'])->toBe('Online Banking')
        ->and($funding[1]['method_label'])->toBe('Wire Transfer');
});

it('excludes deposits after the investment date', function () {
    $investedAt = now()->subDays(3);

    $investment = Investment::query()->create([
        'project_id' => $this->project->id,
        'investor_id' => $this->investor->id,
        'amount' => 1000,
        'status' => 'active',
        'payment_source' => InvestmentPaymentSource::WALLET,
        'reference' => 'INV-100',
        'invested_at' => $investedAt,
        'approved_at' => $investedAt,
    ]);

    Deposit::query()->create([
        'investor_id' => $this->investor->id,
        'amount' => 1000,
        'currency' => 'USD',
        'method' => 'bank',
        'reference' => 'DEP-LATE',
        'status' => 'approved',
        'reviewed_at' => now(),
    ]);

    expect(InvestmentPaymentSource::walletFundingDeposits($investment))->toHaveCount(0);
});
