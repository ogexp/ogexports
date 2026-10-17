<?php

use App\Models\Investment;
use App\Models\InvestmentProject;
use App\Models\InvestorAutoInvestExecution;
use App\Models\InvestorAutoInvestSetting;
use App\Models\KycApplication;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Models\Wallet;
use App\Support\InvestorAutoInvestService;
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
    KycApplication::query()->create([
        'user_id' => $this->investor->id,
        'type' => 'individual',
        'country' => 'Pakistan',
        'status' => 'approved',
        'submitted_at' => now(),
        'reviewed_at' => now(),
    ]);
    Wallet::query()->create([
        'user_id' => $this->investor->id,
        'currency' => 'USD',
        'available_balance' => 500,
        'pending_balance' => 0,
    ]);
});

it('saves only the signed-in investor auto-invest rule', function () {
    $this->actingAs($this->investor)->putJson('/api/investor/auto-invest', [
        'enabled' => true,
        'amount' => 200,
        'commodity' => 'Rice',
        'container_type' => '20FT',
    ])->assertOk()
        ->assertJsonPath('data.enabled', true)
        ->assertJsonPath('data.amount', 200);

    expect(InvestorAutoInvestSetting::query()->where('user_id', $this->investor->id)->value('commodity'))->toBe('Rice');
    $this->actingAs($this->investor)->getJson('/api/investor/auto-invest')
        ->assertOk()
        ->assertJsonPath('data.container_type', '20FT');
});

it('places one wallet investment for a newly matching funding container and does not duplicate it', function () {
    InvestorAutoInvestSetting::query()->create([
        'user_id' => $this->investor->id,
        'enabled' => true,
        'amount' => 200,
        'commodity' => 'rice',
        'container_type' => '20ft',
    ]);
    $project = InvestmentProject::query()->create([
        'title' => 'New rice container',
        'type' => 'container',
        'status' => 'funding',
        'commodity' => 'Rice',
        'container_type' => '20FT',
        'target_amount' => 1000,
        'raised_amount' => 0,
        'investors_count' => 0,
        'min_investment' => 100,
        'max_investment' => 300,
    ]);

    $service = app(InvestorAutoInvestService::class);
    $service->processNewFundingProject($project->id);
    $service->processNewFundingProject($project->id);

    expect(Investment::query()->where('investor_id', $this->investor->id)->where('project_id', $project->id)->count())->toBe(1)
        ->and((float) Wallet::query()->where('user_id', $this->investor->id)->value('available_balance'))->toBe(300.0)
        ->and(InvestorAutoInvestExecution::query()->where('user_id', $this->investor->id)->where('project_id', $project->id)->value('status'))->toBe('invested');
});
