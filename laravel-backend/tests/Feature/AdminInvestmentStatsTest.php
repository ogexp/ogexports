<?php

use App\Models\Investment;
use App\Models\InvestmentProject;
use App\Models\KycApplication;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Support\InvestmentCapacity;
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

    $this->admin = User::factory()->create(['account_status' => 'active']);
    $this->admin->assignRole('admin');

    $this->investorA = User::factory()->create(['account_status' => 'active']);
    $this->investorA->assignRole('investor');

    $this->investorB = User::factory()->create(['account_status' => 'active']);
    $this->investorB->assignRole('investor');
});

function createFundingProject(array $overrides = []): InvestmentProject
{
    return InvestmentProject::query()->create(array_merge([
        'title' => 'Test Container Export',
        'type' => 'container',
        'status' => 'funding',
        'target_amount' => 10000,
        'raised_amount' => 0,
        'investors_count' => 0,
        'min_investment' => 100,
        'expected_return_pct' => 8,
    ], $overrides));
}

it('counts eligible investors as pending plus approved distinct investors', function () {
    $project = createFundingProject();

    Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorA->id,
        'amount' => 1000,
        'status' => 'pending',
        'invested_at' => now(),
    ]);
    Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorB->id,
        'amount' => 2000,
        'status' => 'active',
        'invested_at' => now(),
    ]);
    Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorA->id,
        'amount' => 500,
        'status' => 'cancelled',
        'invested_at' => now(),
    ]);

    $capacity = InvestmentCapacity::snapshot($project);

    expect($capacity['eligible_investors_count'])->toBe(2)
        ->and($capacity['active_raised'])->toBe(2000.0);
});

it('returns live raised and investor totals from the stats endpoint', function () {
    $project = createFundingProject([
        'raised_amount' => 99999,
        'investors_count' => 99,
    ]);

    Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorA->id,
        'amount' => 3000,
        'status' => 'active',
        'invested_at' => now(),
    ]);
    Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorB->id,
        'amount' => 1500,
        'status' => 'pending',
        'invested_at' => now(),
    ]);

    $this->actingAs($this->admin)
        ->getJson('/api/admin/investment-projects/stats')
        ->assertOk()
        ->assertJsonPath('data.totals.total_raised', 3000)
        ->assertJsonPath('data.totals.total_investors', 2);
});

it('exposes eligible investor count and approved raised on project listing', function () {
    $project = createFundingProject([
        'raised_amount' => 50000,
        'investors_count' => 50,
    ]);

    Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorA->id,
        'amount' => 4000,
        'status' => 'active',
        'invested_at' => now(),
    ]);
    Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorB->id,
        'amount' => 1000,
        'status' => 'pending',
        'invested_at' => now(),
    ]);

    $this->actingAs($this->admin)
        ->getJson('/api/admin/investment-projects')
        ->assertOk()
        ->assertJsonPath('data.0.raised_amount', 4000)
        ->assertJsonPath('data.0.investors_count', 2);
});

it('auto sets project status to investment_confirmed when approval reaches target', function () {
    $project = createFundingProject(['target_amount' => 5000]);

    $wallet = Wallet::query()->create([
        'user_id' => $this->investorA->id,
        'currency' => 'USD',
        'available_balance' => 0,
        'pending_balance' => 5000,
    ]);

    $investment = Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorA->id,
        'amount' => 5000,
        'status' => 'pending',
        'reference' => 'INV-PENDING-1',
        'invested_at' => now(),
    ]);

    WalletTransaction::query()->create([
        'wallet_id' => $wallet->id,
        'type' => 'investment',
        'amount' => 5000,
        'direction' => 'debit',
        'reference' => 'INV-PENDING-1',
        'status' => 'pending',
        'meta' => ['investment_id' => $investment->id, 'project_id' => $project->id],
    ]);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/investment-projects/{$project->id}/investments/{$investment->id}/approve")
        ->assertOk()
        ->assertJsonPath('data.status', 'active');

    expect($project->fresh()->status)->toBe('investment_confirmed');
});

it('blocks new investments when project is not in funding status', function () {
    $project = createFundingProject(['status' => 'investment_confirmed']);

    KycApplication::query()->create([
        'user_id' => $this->investorA->id,
        'type' => 'individual',
        'country' => 'Pakistan',
        'status' => 'approved',
        'submitted_at' => now(),
        'reviewed_at' => now(),
    ]);

    Wallet::query()->create([
        'user_id' => $this->investorA->id,
        'currency' => 'USD',
        'available_balance' => 5000,
        'pending_balance' => 0,
    ]);

    $this->actingAs($this->investorA)
        ->postJson("/api/investor/projects/{$project->id}/invest", [
            'amount' => 1000,
        ])
        ->assertNotFound();
});
