<?php

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

it('allows admin to update facility content for plant feed and ricemill', function (string $type) {
    $payload = [
        'content' => [
            'layoutTitle' => "Dynamic {$type} title",
            'layoutSubtitle' => 'Admin managed subtitle',
            'projectStatus' => 'Operational',
            'stats' => [
                [
                    'label' => 'Plant capacity',
                    'value' => '120 MT/day',
                    'change' => 'full capacity target',
                    'color' => 'text-emerald-500',
                ],
            ],
            'utilizationRows' => [
                ['label' => 'Overall output', 'value' => '72 / 120 MT/day', 'pct' => 60],
            ],
            'productionData' => [
                ['month' => 'Jan', 'output' => 48, 'revenue' => 144000, 'profit' => 22000],
            ],
            'processingStages' => [
                [
                    'id' => 1,
                    'label' => 'Intake',
                    'desc' => 'Raw intake',
                    'capacity' => '120 MT/day',
                    'status' => 'operational',
                ],
            ],
            'timeline' => [
                ['year' => '2026', 'q' => 'Q1', 'label' => 'Milestone', 'desc' => 'Done', 'done' => true],
            ],
            'operationalUpdates' => [
                ['date' => '2026-07-10', 'title' => 'Update', 'desc' => 'Ops update'],
            ],
            'hero' => [
                'eyebrow' => 'Opportunity',
                'title' => 'Invest now',
                'description' => 'Dynamic hero',
                'investCta' => 'Invest',
                'downloadCta' => 'Download',
                'meetingCta' => 'Meet',
            ],
            'overviewDetails' => [
                ['label' => 'Location', 'value' => 'Depalpur'],
            ],
            'faqs' => [
                ['question' => 'Minimum?', 'answer' => 'USD 100'],
            ],
        ],
    ];

    $this->actingAs($this->admin)
        ->putJson("/api/admin/facility-content/{$type}", $payload)
        ->assertOk()
        ->assertJsonPath('data.layoutTitle', "Dynamic {$type} title")
        ->assertJsonPath('data.stats.0.value', '120 MT/day')
        ->assertJsonPath('data.hero.title', 'Invest now');

    $this->actingAs($this->investor)
        ->getJson("/api/investor/facility-content/{$type}")
        ->assertOk()
        ->assertJsonPath('data.layoutTitle', "Dynamic {$type} title")
        ->assertJsonPath('data.productionData.0.month', 'Jan')
        ->assertJsonPath('data.faqs.0.question', 'Minimum?');
})->with(['plant', 'feed', 'ricemill']);

it('returns empty facility content when none has been saved', function () {
    $this->actingAs($this->investor)
        ->getJson('/api/investor/facility-content/plant')
        ->assertOk()
        ->assertJsonPath('data', []);
});

it('rejects malformed facility content payloads', function () {
    $this->actingAs($this->admin)
        ->putJson('/api/admin/facility-content/plant', [
            'content' => 'not-an-array',
        ])
        ->assertStatus(422);
});

it('blocks unauthorized access to facility content apis', function () {
    $this->getJson('/api/investor/facility-content/plant')
        ->assertUnauthorized();

    $this->putJson('/api/admin/facility-content/plant', [
        'content' => ['layoutTitle' => 'Nope'],
    ])->assertUnauthorized();

    $this->actingAs($this->investor)
        ->putJson('/api/admin/facility-content/plant', [
            'content' => ['layoutTitle' => 'Nope'],
        ])
        ->assertForbidden();
});

it('returns 404 for unsupported facility content types', function () {
    $this->actingAs($this->investor)
        ->getJson('/api/investor/facility-content/containers')
        ->assertNotFound();

    $this->actingAs($this->admin)
        ->putJson('/api/admin/facility-content/containers', [
            'content' => ['layoutTitle' => 'Nope'],
        ])
        ->assertNotFound();
});
