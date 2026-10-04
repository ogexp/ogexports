<?php

use App\Models\InvestmentProject;
use App\Models\PlatformSetting;
use App\Models\User;
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

    $this->investor = User::factory()->create(['account_status' => 'active']);
    $this->investor->assignRole('investor');
});

it('lists feed facility projects for investors with description roi and meta', function () {
    InvestmentProject::query()->create([
        'title' => 'Poultry Feed Line — Phase 1',
        'type' => 'feed',
        'status' => 'funding',
        'target_amount' => 720000,
        'raised_amount' => 0,
        'investors_count' => 0,
        'roi_label' => '12–18% annual',
        'expected_return_pct' => 15,
        'min_investment' => 100,
        'description' => 'New broiler and layer feed line.',
        'meta' => [
            'facility_code' => 'FM-001',
            'timeline' => 'Q4 2026 — Q2 2027',
            'sort_order' => 1,
        ],
    ]);

    $response = $this->actingAs($this->investor)
        ->getJson('/api/investor/projects?type=feed')
        ->assertOk();

    $row = collect($response->json('data'))->firstWhere('title', 'Poultry Feed Line — Phase 1');
    expect($row)->not->toBeNull()
        ->and($row['description'])->toBe('New broiler and layer feed line.')
        ->and($row['roi_label'])->toBe('12–18% annual')
        ->and($row['meta']['timeline'])->toBe('Q4 2026 — Q2 2027')
        ->and($row['meta']['sort_order'])->toBe(1);
});

it('returns feed projects ordered by meta sort_order ascending', function () {
    InvestmentProject::query()->create([
        'title' => 'Feed Third',
        'type' => 'feed',
        'status' => 'funding',
        'target_amount' => 1000,
        'raised_amount' => 0,
        'min_investment' => 100,
        'meta' => ['sort_order' => 3],
    ]);
    InvestmentProject::query()->create([
        'title' => 'Feed First',
        'type' => 'feed',
        'status' => 'funding',
        'target_amount' => 1000,
        'raised_amount' => 0,
        'min_investment' => 100,
        'meta' => ['sort_order' => 1],
    ]);
    InvestmentProject::query()->create([
        'title' => 'Feed Second',
        'type' => 'feed',
        'status' => 'funding',
        'target_amount' => 1000,
        'raised_amount' => 0,
        'min_investment' => 100,
        'meta' => ['sort_order' => 2],
    ]);

    $titles = collect(
        $this->actingAs($this->investor)
            ->getJson('/api/investor/projects?type=feed')
            ->assertOk()
            ->json('data')
    )->pluck('title')->values()->all();

    expect($titles)->toBe(['Feed First', 'Feed Second', 'Feed Third']);
});

it('surfaces admin-created ricemill projects on investor list and removes them after delete', function () {
    $create = $this->actingAs($this->admin)
        ->postJson('/api/admin/investment-projects', [
            'title' => 'Admin Rice Opportunity',
            'type' => 'ricemill',
            'status' => 'funding',
            'target_amount' => 500000,
            'raised_amount' => 0,
            'roi_label' => '14–20%',
            'expected_return_pct' => 17,
            'min_investment' => 100,
            'description' => 'Created from admin panel',
            'meta' => [
                'timeline' => 'Q1 2027 — Q3 2027',
                'sort_order' => 5,
            ],
        ])
        ->assertCreated();

    $id = $create->json('data.id');
    expect($id)->not->toBeNull();

    $this->actingAs($this->investor)
        ->getJson('/api/investor/projects?type=ricemill')
        ->assertOk()
        ->assertJsonFragment(['title' => 'Admin Rice Opportunity']);

    $this->actingAs($this->admin)
        ->deleteJson("/api/admin/investment-projects/{$id}")
        ->assertOk();

    $titles = collect(
        $this->actingAs($this->investor)
            ->getJson('/api/investor/projects?type=ricemill')
            ->assertOk()
            ->json('data')
    )->pluck('title');

    expect($titles)->not->toContain('Admin Rice Opportunity');
});

it('includes project type on dashboard opportunities', function () {
    InvestmentProject::query()->create([
        'title' => 'Dashboard Feed Opp',
        'type' => 'feed',
        'status' => 'funding',
        'target_amount' => 10000,
        'raised_amount' => 0,
        'min_investment' => 100,
        'expected_return_pct' => 12,
    ]);

    $response = $this->actingAs($this->investor)
        ->getJson('/api/investor/dashboard')
        ->assertOk();

    $opp = collect($response->json('data.opportunities'))->firstWhere('product', 'Dashboard Feed Opp');
    expect($opp)->not->toBeNull()
        ->and($opp['type'])->toBe('feed');
});
