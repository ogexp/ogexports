<?php

use App\Models\Investment;
use App\Models\InvestmentProject;
use App\Models\KycApplication;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Models\Wallet;
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
        'available_balance' => 10000,
        'pending_balance' => 0,
    ]);

    $this->containerProject = InvestmentProject::query()->create([
        'title' => 'Premium Basmati Rice → Dubai',
        'type' => 'container',
        'status' => 'funding',
        'target_amount' => 28000,
        'raised_amount' => 5000,
        'investors_count' => 1,
        'min_investment' => 100,
        'expected_return_pct' => 8.5,
    ]);

    $this->plantProject = InvestmentProject::query()->create([
        'title' => 'Plant Project',
        'type' => 'plant',
        'status' => 'funding',
        'target_amount' => 100000,
        'raised_amount' => 0,
        'investors_count' => 0,
        'min_investment' => 1000,
        'expected_return_pct' => 12,
    ]);
});

it('maps container pending investment to funding on investor dashboard', function () {
    Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 5000,
        'status' => 'pending',
        'reference' => 'INV-CONTAINER-PENDING',
        'invested_at' => now(),
    ]);

    $response = $this->actingAs($this->investor)
        ->getJson('/api/investor/dashboard')
        ->assertOk();

    $investments = collect($response->json('data.my_investments'));
    $container = $investments->firstWhere('plan', 'Premium Basmati Rice → Dubai');

    expect($container)->not->toBeNull()
        ->and($container['status'])->toBe('funding')
        ->and($container['investment_status'])->toBe('pending')
        ->and($container['project_status'])->toBe('funding')
        ->and($container['project_type'])->toBe('container');
});

it('keeps pending status for non-container investments on dashboard', function () {
    Investment::query()->create([
        'project_id' => $this->plantProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 3000,
        'status' => 'pending',
        'reference' => 'INV-PLANT-PENDING',
        'invested_at' => now(),
    ]);

    $response = $this->actingAs($this->investor)
        ->getJson('/api/investor/dashboard')
        ->assertOk();

    $investments = collect($response->json('data.my_investments'));
    $plant = $investments->firstWhere('plan', 'Plant Project');

    expect($plant)->not->toBeNull()
        ->and($plant['status'])->toBe('pending')
        ->and($plant['investment_status'])->toBe('pending')
        ->and($plant['project_type'])->toBe('plant');
});
