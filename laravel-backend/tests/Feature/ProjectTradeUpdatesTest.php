<?php

use App\Models\InvestmentProject;
use App\Models\InvestmentProjectTradeUpdate;
use App\Models\Investment;
use App\Models\AppNotification;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Models\UserProfile;
use App\Support\MediaStorage;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

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
        'reference' => 'OG-001',
        'type' => 'container',
        'status' => 'funding',
        'target_amount' => 20000,
        'raised_amount' => 5000,
        'investors_count' => 1,
        'min_investment' => 100,
    ]);
});

it('lets admins append reported updates and returns them to investors chronologically', function () {
    $this->actingAs($this->admin)
        ->postJson("/api/admin/projects/{$this->project->id}/updates", [
            'status' => 'Cargo procurement completed',
            'description' => 'Cargo has been checked and prepared for container loading.',
            'occurred_at' => '2026-10-02T09:15:00+05:00',
        ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'Cargo procurement completed')
        ->assertJsonPath('data.description', 'Cargo has been checked and prepared for container loading.')
        ->assertJsonPath('data.attachment_url', null);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/projects/{$this->project->id}/updates", [
            'status' => 'Container loading completed',
            'description' => 'The loaded container was sealed.',
            'occurred_at' => '2026-10-04T16:40:00+05:00',
        ])
        ->assertCreated();

    $this->actingAs($this->admin)
        ->getJson("/api/admin/projects/{$this->project->id}/updates")
        ->assertOk()
        ->assertJsonPath('data.0.status', 'Cargo procurement completed')
        ->assertJsonPath('data.1.status', 'Container loading completed');

    $this->actingAs($this->investor)
        ->getJson("/api/investor/projects/{$this->project->id}")
        ->assertOk()
        ->assertJsonPath('data.reference', 'OG-001')
        ->assertJsonPath('data.trade_updates.0.status', 'Cargo procurement completed')
        ->assertJsonPath('data.trade_updates.1.status', 'Container loading completed');

    $investment = Investment::query()->create([
        'project_id' => $this->project->id,
        'investor_id' => $this->investor->id,
        'amount' => 5000,
        'status' => 'active',
        'invested_at' => now(),
    ]);

    $this->actingAs($this->investor)
        ->getJson("/api/investor/investments/{$investment->id}")
        ->assertOk()
        ->assertJsonPath('data.project.trade_updates.0.status', 'Cargo procurement completed')
        ->assertJsonPath('data.project.trade_updates.1.status', 'Container loading completed');
});

it('notifies active investors from persisted trade updates according to category and legacy preferences', function () {
    Investment::query()->create([
        'project_id' => $this->project->id,
        'investor_id' => $this->investor->id,
        'amount' => 5000,
        'status' => 'active',
        'invested_at' => now(),
    ]);

    $categoryMuted = User::factory()->create(['account_status' => 'active']);
    $categoryMuted->assignRole('investor');
    UserProfile::query()->create([
        'user_id' => $categoryMuted->id,
        'meta' => ['notification_prefs' => ['trade' => false, 'marketUpdates' => true]],
    ]);

    $legacyMuted = User::factory()->create(['account_status' => 'active']);
    $legacyMuted->assignRole('investor');
    UserProfile::query()->create([
        'user_id' => $legacyMuted->id,
        'meta' => ['notification_prefs' => ['marketUpdates' => false]],
    ]);

    $categoryEnabled = User::factory()->create(['account_status' => 'active']);
    $categoryEnabled->assignRole('investor');
    UserProfile::query()->create([
        'user_id' => $categoryEnabled->id,
        'meta' => ['notification_prefs' => ['trade' => true, 'marketUpdates' => false]],
    ]);

    foreach ([$categoryMuted, $legacyMuted, $categoryEnabled] as $investor) {
        Investment::query()->create([
            'project_id' => $this->project->id,
            'investor_id' => $investor->id,
            'amount' => 1000,
            'status' => 'active',
            'invested_at' => now(),
        ]);
    }

    $inactiveInvestor = User::factory()->create(['account_status' => 'active']);
    $inactiveInvestor->assignRole('investor');
    Investment::query()->create([
        'project_id' => $this->project->id,
        'investor_id' => $inactiveInvestor->id,
        'amount' => 1000,
        'status' => 'completed',
        'invested_at' => now(),
    ]);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/projects/{$this->project->id}/updates", [
            'status' => 'Container departed',
            'description' => 'The verified shipment departed the port.',
            'occurred_at' => '2026-10-04T09:00:00+05:00',
        ])
        ->assertCreated();

    $notifiedInvestorIds = AppNotification::query()
        ->where('type', 'shipment_update')
        ->pluck('user_id')
        ->all();
    expect($notifiedInvestorIds)->toEqualCanonicalizing([
        $this->investor->id,
        $categoryEnabled->id,
    ]);

    $this->actingAs($this->investor)
        ->getJson('/api/investor/notifications')
        ->assertOk()
        ->assertJsonPath('data.0.category', 'Trade')
        ->assertJsonPath('data.0.title', 'Trade update: Container departed')
        ->assertJsonPath('data.0.body', 'The verified shipment departed the port.');
});

it('merges category preferences without clearing existing investor settings', function () {
    $profile = UserProfile::query()->create([
        'user_id' => $this->investor->id,
        'meta' => [
            'notification_prefs' => ['marketUpdates' => true, 'inApp' => true],
            'investor_note' => 'Keep this profile metadata.',
        ],
    ]);

    $this->actingAs($this->investor)
        ->putJson('/api/investor/profile', [
            'notification_prefs' => ['trade' => false],
        ])
        ->assertOk()
        ->assertJsonPath('data.notification_prefs.marketUpdates', true)
        ->assertJsonPath('data.notification_prefs.inApp', true)
        ->assertJsonPath('data.notification_prefs.trade', false);

    expect($profile->fresh()->meta['investor_note'])->toBe('Keep this profile metadata.')
        ->and($profile->fresh()->meta['notification_prefs'])->toBe([
            'marketUpdates' => true,
            'inApp' => true,
            'trade' => false,
        ]);
});

it('requires an administrator and valid status, description, and event time', function () {
    $this->postJson("/api/admin/projects/{$this->project->id}/updates", [])
        ->assertUnauthorized();

    $this->actingAs($this->investor)
        ->postJson("/api/admin/projects/{$this->project->id}/updates", [
            'status' => 'Not authorized',
            'description' => 'Investor-submitted event',
            'occurred_at' => '2026-10-02T09:15:00+05:00',
        ])
        ->assertForbidden();

    $this->actingAs($this->admin)
        ->postJson("/api/admin/projects/{$this->project->id}/updates", [
            'status' => '',
            'description' => '',
            'occurred_at' => 'not-a-time',
        ])
        ->assertUnprocessable();
});

it('lets an investor download an update attachment only through the authenticated project route', function () {
    $response = $this->actingAs($this->admin)
        ->post("/api/admin/projects/{$this->project->id}/updates", [
            'status' => 'Document received',
            'description' => 'OG Exports attached a supporting document.',
            'occurred_at' => '2026-10-03T11:20:00+05:00',
            'attachment' => UploadedFile::fake()->create('bill-of-lading.pdf', 5, 'application/pdf'),
        ], ['Accept' => 'application/json'])
        ->assertCreated();

    $update = InvestmentProjectTradeUpdate::query()->findOrFail($response->json('data.id'));

    try {
        $this->actingAs($this->investor)
            ->getJson("/api/investor/projects/{$this->project->id}")
            ->assertOk()
            ->assertJsonPath('data.trade_updates.0.attachment_name', 'bill-of-lading.pdf')
            ->assertJsonPath('data.trade_updates.0.attachment_mime', 'application/pdf');

        $download = $this->actingAs($this->investor)
            ->get("/api/investor/projects/{$this->project->id}/updates/{$update->id}/attachment");
        $download->assertOk();
        expect($download->getContent())->not->toBeEmpty();
    } finally {
        if (MediaStorage::exists($update->attachment_path)) {
            MediaStorage::delete($update->attachment_path);
        }
    }
});