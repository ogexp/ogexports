<?php

use App\Models\Investment;
use App\Models\InvestmentProject;
use App\Models\InvestorAutoInvestExecution;
use App\Models\InvestorAutoInvestSetting;
use App\Models\KycApplication;
use App\Models\PlatformSetting;
use App\Models\Product;
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
    Product::query()->create(['name' => 'Rice', 'slug' => 'rice', 'status' => 'approved']);
    $this->actingAs($this->investor)->putJson('/api/investor/auto-invest', [
        'enabled' => true,
        'amount' => 200,
        'commodity' => 'Rice',
    ])->assertOk()
        ->assertJsonPath('data.enabled', true)
        ->assertJsonPath('data.amount', 200)
        ->assertJsonPath('data.container_type', null);

    expect(InvestorAutoInvestSetting::query()->where('user_id', $this->investor->id)->value('commodity'))->toBe('Rice')
        ->and(InvestorAutoInvestSetting::query()->where('user_id', $this->investor->id)->value('container_type'))->toBe('ANY');
    $this->actingAs($this->investor)->getJson('/api/investor/auto-invest')
        ->assertOk()
        ->assertJsonPath('data.container_type', null);
});

it('only lists products approved for the public website as auto-invest choices', function () {
    Product::query()->create(['name' => 'Basmati Rice', 'slug' => 'basmati-rice', 'status' => 'approved']);
    Product::query()->create(['name' => 'Draft Mango', 'slug' => 'draft-mango', 'status' => 'draft']);

    $this->actingAs($this->investor)->getJson('/api/investor/auto-invest/commodities')
        ->assertOk()
        ->assertJsonPath('data.0.name', 'Basmati Rice')
        ->assertJsonCount(1, 'data');
});

it('places one wallet investment for a newly matching funding container and does not duplicate it', function () {
    Product::query()->create(['name' => 'Rice', 'slug' => 'rice', 'status' => 'approved']);
    $this->actingAs($this->investor)->putJson('/api/investor/auto-invest', [
        'enabled' => true,
        'amount' => 200,
        'commodity' => 'Rice',
    ])->assertOk();
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

    $this->actingAs($this->investor)->getJson('/api/investor/auto-invest')
        ->assertOk()
        ->assertJsonPath('data.recent_activity.0.status', 'invested')
        ->assertJsonPath('data.recent_activity.0.project_id', $project->id);
});

it('does not backfill an opportunity that was already funding when the rule was enabled', function () {
    Product::query()->create(['name' => 'Rice', 'slug' => 'rice', 'status' => 'approved']);
    $project = InvestmentProject::query()->create([
        'title' => 'Already open rice container',
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

    $this->actingAs($this->investor)->putJson('/api/investor/auto-invest', [
        'enabled' => true,
        'amount' => 200,
        'commodity' => 'Rice',
        'container_type' => '20FT',
    ])->assertOk();

    expect(InvestorAutoInvestExecution::query()->where('project_id', $project->id)->exists())->toBeFalse()
        ->and(Investment::query()->where('project_id', $project->id)->exists())->toBeFalse()
        ->and((float) Wallet::query()->where('user_id', $this->investor->id)->value('available_balance'))->toBe(500.0);

    $this->actingAs($this->investor)->putJson('/api/investor/auto-invest', [
        'enabled' => false,
        'amount' => 200,
        'commodity' => 'Rice',
    ])->assertOk()->assertJsonPath('data.enabled', false);
});

it('does not place an investment for a disabled matching rule', function () {
    InvestorAutoInvestSetting::query()->create([
        'user_id' => $this->investor->id,
        'enabled' => false,
        'amount' => 200,
        'commodity' => 'Rice',
        'container_type' => '20FT',
    ]);
    $project = InvestmentProject::query()->create([
        'title' => 'Rice container',
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

    app(InvestorAutoInvestService::class)->processNewFundingProject($project->id);

    expect(InvestorAutoInvestExecution::query()->where('project_id', $project->id)->exists())->toBeFalse()
        ->and(Investment::query()->where('project_id', $project->id)->exists())->toBeFalse()
        ->and((float) Wallet::query()->where('user_id', $this->investor->id)->value('available_balance'))->toBe(500.0);
});

it('rejects incomplete auto-invest rules without saving them', function () {
    $this->actingAs($this->investor)->putJson('/api/investor/auto-invest', [
        'enabled' => true,
        'amount' => 200,
        'commodity' => '',
        'container_type' => '20FT',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['commodity']);

    expect(InvestorAutoInvestSetting::query()->where('user_id', $this->investor->id)->exists())->toBeFalse();
});

it('rejects a rule for a product that is not publicly approved', function () {
    Product::query()->create(['name' => 'Hidden Rice', 'slug' => 'hidden-rice', 'status' => 'draft']);

    $this->actingAs($this->investor)->putJson('/api/investor/auto-invest', [
        'enabled' => true,
        'amount' => 200,
        'commodity' => 'Hidden Rice',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['commodity']);

    expect(InvestorAutoInvestSetting::query()->where('user_id', $this->investor->id)->exists())->toBeFalse();
});

it('does not execute a saved rule after its product is no longer publicly approved', function () {
    $product = Product::query()->create(['name' => 'Rice', 'slug' => 'rice', 'status' => 'approved']);
    InvestorAutoInvestSetting::query()->create([
        'user_id' => $this->investor->id,
        'enabled' => true,
        'amount' => 200,
        'commodity' => 'Rice',
        'container_type' => 'ANY',
    ]);
    $project = InvestmentProject::query()->create([
        'title' => 'Rice container',
        'type' => 'container',
        'status' => 'funding',
        'commodity' => 'Rice',
        'container_type' => '40FT',
        'target_amount' => 1000,
        'raised_amount' => 0,
        'investors_count' => 0,
        'min_investment' => 100,
        'max_investment' => 300,
    ]);
    $product->update(['status' => 'archived']);

    app(InvestorAutoInvestService::class)->processNewFundingProject($project->id);

    expect(InvestorAutoInvestExecution::query()->where('project_id', $project->id)->exists())->toBeFalse()
        ->and(Investment::query()->where('project_id', $project->id)->exists())->toBeFalse()
        ->and((float) Wallet::query()->where('user_id', $this->investor->id)->value('available_balance'))->toBe(500.0);
});
