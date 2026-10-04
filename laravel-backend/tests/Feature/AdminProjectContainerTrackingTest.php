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
        'type' => 'container',
        'status' => 'funding',
        'target_amount' => 20000,
        'raised_amount' => 5000,
        'investors_count' => 1,
        'min_investment' => 100,
    ]);
});

it('lets admins publish a first reported record with all six stages initialized', function () {
    $response = $this->actingAs($this->admin)
        ->patchJson("/api/admin/projects/{$this->project->id}/container-tracking", [
            'container_number' => 'OGXU1234567',
            'trade_status' => 'Departed — reported by OG Exports',
            'container_journey' => [
                'origin' => [
                    'status' => 'Packed',
                    'date' => '2026-10-02',
                    'details' => 'Cargo packed and sealed.',
                ],
            ],
        ])
        ->assertOk()
        ->assertJsonPath('container_number', 'OGXU1234567')
        ->assertJsonPath('container_journey.origin.status', 'Packed')
        ->assertJsonPath('container_journey.origin.date', '2026-10-02')
        ->assertJsonPath('container_journey.origin.details', 'Cargo packed and sealed.')
        ->assertJsonPath('container_journey.port.status', null)
        ->assertJsonPath('container_journey.vessel.status', null)
        ->assertJsonPath('container_journey.destination.status', null)
        ->assertJsonPath('container_journey.buyer.status', null)
        ->assertJsonPath('container_journey.settlement.status', null);

    expect($response->json('tracking_updated_at'))->toBeString()->not->toBeEmpty();

    $record = $this->project->containerTracking()->firstOrFail();
    expect($record->container_journey['origin']['status'])->toBe('Packed')
        ->and($record->tracking_updated_at)->not->toBeNull();
});

it('merges omitted values while allowing an admin to clear explicitly supplied values', function () {
    $this->actingAs($this->admin)
        ->patchJson("/api/admin/projects/{$this->project->id}/container-tracking", [
            'container_number' => 'OGXU1234567',
            'container_journey' => [
                'origin' => [
                    'status' => 'Packed',
                    'date' => '2026-10-02',
                    'details' => 'Initial note.',
                ],
            ],
        ])
        ->assertOk();

    $this->actingAs($this->admin)
        ->patchJson("/api/admin/projects/{$this->project->id}/container-tracking", [
            'container_journey' => [
                'origin' => ['details' => null],
                'buyer' => ['status' => 'Received by buyer'],
            ],
        ])
        ->assertOk()
        ->assertJsonPath('container_number', 'OGXU1234567')
        ->assertJsonPath('container_journey.origin.status', 'Packed')
        ->assertJsonPath('container_journey.origin.date', '2026-10-02')
        ->assertJsonPath('container_journey.origin.details', null)
        ->assertJsonPath('container_journey.buyer.status', 'Received by buyer')
        ->assertJsonPath('container_journey.settlement.status', null);

    $this->actingAs($this->admin)
        ->getJson("/api/admin/projects/{$this->project->id}/container-tracking")
        ->assertOk()
        ->assertJsonPath('container_journey.origin.details', null)
        ->assertJsonPath('container_journey.buyer.status', 'Received by buyer');
});

it('rejects investor access and does not allow clients to set server timestamps', function () {
    $this->getJson("/api/admin/projects/{$this->project->id}/container-tracking")
        ->assertUnauthorized();

    $this->actingAs($this->investor)
        ->getJson("/api/admin/projects/{$this->project->id}/container-tracking")
        ->assertForbidden();

    $this->actingAs($this->investor)
        ->patchJson("/api/admin/projects/{$this->project->id}/container-tracking", [
            'trade_status' => 'Reported by investor',
        ])
        ->assertForbidden();

    $this->actingAs($this->admin)
        ->patchJson("/api/admin/projects/{$this->project->id}/container-tracking", [
            'tracking_updated_at' => '2000-01-01T00:00:00Z',
        ])
        ->assertUnprocessable();

    $this->actingAs($this->admin)
        ->patchJson("/api/admin/projects/{$this->project->id}/container-tracking", [
            'unrecognized' => 'value',
        ])
        ->assertUnprocessable();

    expect($this->project->containerTracking()->exists())->toBeFalse();
});

it('returns 404 for missing projects or unpublished tracking records', function () {
    $this->actingAs($this->admin)
        ->getJson("/api/admin/projects/{$this->project->id}/container-tracking")
        ->assertNotFound();

    $this->actingAs($this->admin)
        ->getJson('/api/admin/projects/999999/container-tracking')
        ->assertNotFound();
});

it('includes the reported project record in investor project and investment details', function () {
    $this->actingAs($this->admin)
        ->patchJson("/api/admin/projects/{$this->project->id}/container-tracking", [
            'latest_tracking_update' => 'OG Exports reported departure from Port Qasim.',
            'container_journey' => [
                'vessel' => ['status' => 'Loaded', 'date' => '2026-10-03'],
            ],
        ])
        ->assertOk();

    $investment = Investment::query()->create([
        'project_id' => $this->project->id,
        'investor_id' => $this->investor->id,
        'amount' => 5000,
        'status' => 'active',
        'invested_at' => now(),
    ]);

    $this->actingAs($this->investor)
        ->getJson("/api/investor/projects/{$this->project->id}")
        ->assertOk()
        ->assertJsonPath('data.container.latest_tracking_update', 'OG Exports reported departure from Port Qasim.')
        ->assertJsonPath('data.container.container_journey.vessel.status', 'Loaded')
        ->assertJsonPath('data.container.container_journey.destination.status', null);

    $this->actingAs($this->investor)
        ->getJson("/api/investor/investments/{$investment->id}")
        ->assertOk()
        ->assertJsonPath('data.project.container.latest_tracking_update', 'OG Exports reported departure from Port Qasim.')
        ->assertJsonPath('data.project.container.container_journey.vessel.status', 'Loaded');
});
