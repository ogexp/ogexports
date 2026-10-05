<?php

use App\Models\Investment;
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
    $this->project = InvestmentProject::query()->create([
        'title' => 'Reported Container Project',
        'reference' => 'OG-STAGE-001',
        'type' => 'container',
        'status' => 'funding',
        'target_amount' => 20000,
        'raised_amount' => 5000,
        'investors_count' => 1,
        'min_investment' => 100,
        'investment_period_days' => 45,
    ]);
});

it('lets admins append explicit per-stage updates without inferring other stages', function () {
    $this->actingAs($this->admin)
        ->postJson("/api/admin/projects/{$this->project->id}/stage-updates", [
            'stage' => 'funding',
            'status' => 'completed',
            'description' => 'The funding target was confirmed.',
            'occurred_at' => '2026-10-02T09:15:00+05:00',
        ])
        ->assertCreated()
        ->assertJsonPath('data.stage', 'funding')
        ->assertJsonPath('data.status', 'completed');

    $this->actingAs($this->admin)
        ->postJson("/api/admin/projects/{$this->project->id}/stage-updates", [
            'stage' => 'cargo_loaded',
            'status' => 'in_progress',
            'description' => 'Loading is underway.',
            'occurred_at' => '2026-10-04T16:40:00+05:00',
        ])
        ->assertCreated();

    $this->actingAs($this->admin)
        ->getJson("/api/admin/projects/{$this->project->id}/stage-updates")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.stage', 'funding')
        ->assertJsonPath('data.1.stage', 'cargo_loaded');

    $this->actingAs($this->investor)
        ->getJson("/api/investor/projects/{$this->project->id}")
        ->assertOk()
        ->assertJsonCount(2, 'data.stage_updates')
        ->assertJsonPath('data.stage_updates.0.status', 'completed')
        ->assertJsonPath('data.stage_updates.1.status', 'in_progress');
});

it('rejects invalid milestone values and non-container projects', function () {
    $this->actingAs($this->admin)
        ->postJson("/api/admin/projects/{$this->project->id}/stage-updates", [
            'stage' => 'unknown_stage',
            'status' => 'completed',
            'description' => 'Invalid stage.',
            'occurred_at' => '2026-10-04T16:40:00+05:00',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['stage']);

    $facility = InvestmentProject::query()->create([
        'title' => 'Facility Project',
        'reference' => 'OG-STAGE-FACILITY',
        'type' => 'facility',
        'status' => 'funding',
        'target_amount' => 20000,
        'raised_amount' => 0,
        'investors_count' => 0,
        'min_investment' => 100,
    ]);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/projects/{$facility->id}/stage-updates", [
            'stage' => 'funding',
            'status' => 'completed',
            'description' => 'Not allowed for this project type.',
            'occurred_at' => '2026-10-04T16:40:00+05:00',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['project']);
});

it('returns server-calculated investment-period progress with the stage records', function () {
    $investment = Investment::query()->create([
        'project_id' => $this->project->id,
        'investor_id' => $this->investor->id,
        'amount' => 5000,
        'status' => 'active',
        'invested_at' => now()->subDay(),
    ]);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/projects/{$this->project->id}/stage-updates", [
            'stage' => 'investment_confirmed',
            'status' => 'completed',
            'description' => 'The investment was confirmed.',
            'occurred_at' => '2026-10-05T10:00:00+05:00',
        ])
        ->assertCreated();

    $this->actingAs($this->investor)
        ->getJson("/api/investor/investments/{$investment->id}")
        ->assertOk()
        ->assertJsonPath('data.project.stage_updates.0.stage', 'investment_confirmed')
        ->assertJsonPath('data.investment_period_progress.days_elapsed', 1)
        ->assertJsonPath('data.investment_period_progress.total_days', 45)
        ->assertJsonPath('data.investment_period_progress.progress_percent', 2.2);
});

it('keeps the stage-update endpoints limited to administrators', function () {
    $this->actingAs($this->investor)
        ->getJson("/api/admin/projects/{$this->project->id}/stage-updates")
        ->assertForbidden();
});
