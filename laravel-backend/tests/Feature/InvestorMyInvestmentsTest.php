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
        'available_balance' => 50000,
        'pending_balance' => 0,
    ]);

    $this->containerProject = InvestmentProject::query()->create([
        'title' => 'Container Export Test',
        'type' => 'container',
        'trade_direction' => 'export',
        'status' => 'in_transit',
        'target_amount' => 20000,
        'raised_amount' => 5000,
        'investors_count' => 1,
        'min_investment' => 100,
        'expected_return_pct' => 8,
        'vessel' => 'Test Vessel',
        'port_of_loading' => 'Port Qasim',
        'port_of_discharge' => 'Jebel Ali',
        'etd' => '2026-07-20',
        'eta' => '2026-07-28',
        'investment_period_days' => 45,
    ]);

    $this->plantProject = InvestmentProject::query()->create([
        'title' => 'Plant Project Test',
        'type' => 'plant',
        'status' => 'funding',
        'target_amount' => 100000,
        'raised_amount' => 0,
        'investors_count' => 0,
        'min_investment' => 1000,
        'expected_return_pct' => 12,
    ]);
});

it('filters my investments by project_type container', function () {
    $containerInvestment = Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 5000,
        'status' => 'active',
        'reference' => 'INV-CONTAINER-1',
        'invested_at' => now()->subDay(),
        'approved_at' => now()->subDay(),
    ]);
    $this->containerProject->containerTracking()->create([
        'container_number' => 'OGXU1234567',
        'vessel_name' => 'Reported Vessel',
        'port_of_loading' => 'Port Qasim',
        'destination_port' => 'Jebel Ali',
        'container_journey' => [],
        'tracking_updated_at' => now(),
    ]);

    Investment::query()->create([
        'project_id' => $this->plantProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 3000,
        'status' => 'active',
        'reference' => 'INV-PLANT-1',
        'invested_at' => now(),
        'approved_at' => now(),
    ]);

    $response = $this->actingAs($this->investor)
        ->getJson('/api/investor/investments?project_type=container')
        ->assertOk();

    $data = $response->json('data');
    expect($data)->toHaveCount(1)
        ->and($data[0]['id'])->toBe($containerInvestment->id)
        ->and($data[0]['reference'])->toBe('INV-CONTAINER-1')
        ->and($data[0]['project']['type'])->toBe('container')
        ->and($data[0]['project']['status'])->toBe('in_transit')
        ->and($data[0]['project']['vessel'])->toBe('Test Vessel')
        ->and($data[0]['project']['etd'])->toBe('2026-07-20')
        ->and($data[0]['project']['eta'])->toBe('2026-07-28')
        ->and($data[0]['project']['container']['container_number'])->toBe('OGXU1234567')
        ->and($data[0]['project']['container']['vessel_name'])->toBe('Reported Vessel');
});

it('orders my investments by invested_at descending', function () {
    $older = Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 1000,
        'status' => 'active',
        'reference' => 'INV-OLDER',
        'invested_at' => now()->subDays(5),
        'approved_at' => now()->subDays(5),
    ]);

    $newer = Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 2000,
        'status' => 'active',
        'reference' => 'INV-NEWER',
        'invested_at' => now()->subDay(),
        'approved_at' => now()->subDay(),
    ]);

    $response = $this->actingAs($this->investor)
        ->getJson('/api/investor/investments?project_type=container')
        ->assertOk();

    $ids = collect($response->json('data'))->pluck('id')->all();
    expect($ids)->toBe([$newer->id, $older->id]);
});

it('filters my investments by status when provided', function () {
    Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 1000,
        'status' => 'pending',
        'reference' => 'INV-PENDING',
        'invested_at' => now(),
    ]);

    $active = Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 2000,
        'status' => 'active',
        'reference' => 'INV-ACTIVE',
        'invested_at' => now()->subHour(),
        'approved_at' => now()->subHour(),
    ]);

    $response = $this->actingAs($this->investor)
        ->getJson('/api/investor/investments?project_type=container&status=active')
        ->assertOk();

    $data = $response->json('data');
    expect($data)->toHaveCount(1)
        ->and($data[0]['id'])->toBe($active->id)
        ->and($data[0]['status'])->toBe('active');
});

it('assigns OGEXP-{id}{suffix} reference when investing from wallet on export container', function () {
    $this->containerProject->update(['status' => 'funding', 'trade_direction' => 'export']);

    $response = $this->actingAs($this->investor)
        ->postJson("/api/investor/projects/{$this->containerProject->id}/invest", [
            'amount' => 1000,
        ])
        ->assertCreated();

    $investment = Investment::query()->findOrFail($response->json('data.id'));
    $reference = (string) $investment->reference;

    expect($reference)->toMatch('/^OGEXP-'.$investment->id.'[A-Z0-9]{8,}$/')
        ->and($response->json('data.reference'))->toBe($reference);
});

it('assigns OGIMP-{id}{suffix} reference when investing from wallet on import container', function () {
    $importProject = InvestmentProject::query()->create([
        'title' => 'Container Import Test',
        'type' => 'container',
        'trade_direction' => 'import',
        'status' => 'funding',
        'target_amount' => 20000,
        'raised_amount' => 0,
        'investors_count' => 0,
        'min_investment' => 100,
        'expected_return_pct' => 8,
    ]);

    $response = $this->actingAs($this->investor)
        ->postJson("/api/investor/projects/{$importProject->id}/invest", [
            'amount' => 1000,
        ])
        ->assertCreated();

    $investment = Investment::query()->findOrFail($response->json('data.id'));
    $reference = (string) $investment->reference;

    expect($reference)->toMatch('/^OGIMP-'.$investment->id.'[A-Z0-9]{8,}$/')
        ->and($response->json('data.reference'))->toBe($reference);
});

it('backfills legacy INV-{id} and INV-CTRN references to OG* format', function () {
    $legacy = Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 1500,
        'status' => 'active',
        'reference' => null,
        'invested_at' => now(),
        'approved_at' => now(),
    ]);
    $legacy->forceFill(['reference' => 'INV-'.$legacy->id])->saveQuietly();

    $oldCanonical = Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 1600,
        'status' => 'active',
        'reference' => null,
        'invested_at' => now(),
        'approved_at' => now(),
    ]);
    $oldCanonical->forceFill(['reference' => 'INV-CTRN-'.$oldCanonical->id.'-ABCDEFGH'])->saveQuietly();

    $existingOgctrn = Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 1700,
        'status' => 'active',
        'reference' => 'OGCTRN-88EXISTING1',
        'invested_at' => now(),
        'approved_at' => now(),
    ]);

    $canonical = Investment::query()->create([
        'project_id' => $this->plantProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 2000,
        'status' => 'active',
        'reference' => 'OGPLNT-999ABCDEFGH',
        'invested_at' => now(),
        'approved_at' => now(),
    ]);

    $this->artisan('investments:backfill-references')
        ->assertSuccessful();

    $legacy->refresh();
    $oldCanonical->refresh();
    $existingOgctrn->refresh();
    $canonical->refresh();

    expect($legacy->reference)->toMatch('/^OGEXP-'.$legacy->id.'[A-Z0-9]{8,}$/')
        ->and($oldCanonical->reference)->toMatch('/^OGEXP-'.$oldCanonical->id.'[A-Z0-9]{8,}$/')
        ->and($existingOgctrn->reference)->toBe('OGCTRN-88EXISTING1')
        ->and($canonical->reference)->toBe('OGPLNT-999ABCDEFGH');
});

it('returns plant investments with OGPLNT prefix after wallet invest', function () {
    $this->plantProject->update(['status' => 'funding']);

    $response = $this->actingAs($this->investor)
        ->postJson("/api/investor/projects/{$this->plantProject->id}/invest", [
            'amount' => 2000,
        ])
        ->assertCreated();

    $investment = Investment::query()->findOrFail($response->json('data.id'));

    expect((string) $investment->reference)
        ->toMatch('/^OGPLNT-'.$investment->id.'[A-Z0-9]{8,}$/');
});

it('searches my investments by investment reference prefix', function () {
    $match = Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 5000,
        'status' => 'active',
        'reference' => 'OGCTRN-2LKOBRNNO',
        'invested_at' => now()->subDay(),
        'approved_at' => now()->subDay(),
    ]);

    Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 3000,
        'status' => 'active',
        'reference' => 'OGCTRN-OTHERREF1',
        'invested_at' => now(),
        'approved_at' => now(),
    ]);

    $response = $this->actingAs($this->investor)
        ->getJson('/api/investor/investments?project_type=container&search=OGCTRN-2LK')
        ->assertOk();

    $data = $response->json('data');
    expect($data)->toHaveCount(1)
        ->and($data[0]['id'])->toBe($match->id)
        ->and($data[0]['reference'])->toBe('OGCTRN-2LKOBRNNO');
});

it('searches my investments by OGEXP reference prefix', function () {
    $match = Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 5000,
        'status' => 'active',
        'reference' => 'OGEXP-11NCJPMCAB',
        'invested_at' => now()->subDay(),
        'approved_at' => now()->subDay(),
    ]);

    Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 3000,
        'status' => 'active',
        'reference' => 'OGIMP-11OTHERREF',
        'invested_at' => now(),
        'approved_at' => now(),
    ]);

    $response = $this->actingAs($this->investor)
        ->getJson('/api/investor/investments?project_type=container&search=OGEXP-11')
        ->assertOk();

    $data = $response->json('data');
    expect($data)->toHaveCount(1)
        ->and($data[0]['id'])->toBe($match->id)
        ->and($data[0]['reference'])->toBe('OGEXP-11NCJPMCAB');
});

it('searches my investments by partial reference suffix', function () {
    $match = Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 5000,
        'status' => 'active',
        'reference' => 'OGCTRN-2LKOBRNNO',
        'invested_at' => now()->subDay(),
        'approved_at' => now()->subDay(),
    ]);

    Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 3000,
        'status' => 'active',
        'reference' => 'OGCTRN-OTHERREF1',
        'invested_at' => now(),
        'approved_at' => now(),
    ]);

    $response = $this->actingAs($this->investor)
        ->getJson('/api/investor/investments?project_type=container&search=2LKOBRNNO')
        ->assertOk();

    $data = $response->json('data');
    expect($data)->toHaveCount(1)
        ->and($data[0]['id'])->toBe($match->id);
});

it('combines search with status and project_type filters', function () {
    $match = Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 5000,
        'status' => 'active',
        'reference' => 'OGCTRN-2LKOBRNNO',
        'invested_at' => now()->subDay(),
        'approved_at' => now()->subDay(),
    ]);

    Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 2000,
        'status' => 'pending',
        'reference' => 'OGCTRN-2LKPENDING',
        'invested_at' => now(),
    ]);

    Investment::query()->create([
        'project_id' => $this->plantProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 3000,
        'status' => 'active',
        'reference' => 'OGPLNT-2LKOBRNNO',
        'invested_at' => now(),
        'approved_at' => now(),
    ]);

    $response = $this->actingAs($this->investor)
        ->getJson('/api/investor/investments?project_type=container&status=active&search=2LKOBRNNO')
        ->assertOk();

    $data = $response->json('data');
    expect($data)->toHaveCount(1)
        ->and($data[0]['id'])->toBe($match->id)
        ->and($data[0]['status'])->toBe('active')
        ->and($data[0]['project']['type'])->toBe('container');
});

it('downloads investment position pdf for the owner', function () {
    $investment = Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 2000,
        'amount_pkr' => 560000,
        'exchange_rate' => 280,
        'status' => 'active',
        'reference' => 'OGEXP-18J69CRXCH',
        'invested_at' => now()->subDay(),
        'approved_at' => now()->subDay(),
    ]);

    $this->containerProject->update([
        'commodity' => 'Yellow Maize',
        'container_type' => '40 ft',
        'shipping_line' => 'Maersk',
        'incoterm' => 'CIF',
        'meta' => [
            'container_no' => 'HQ73278373',
            'voyage' => 'YTM01',
        ],
    ]);

    $response = $this->actingAs($this->investor)
        ->get('/api/investor/investments/'.$investment->id.'/pdf')
        ->assertOk();

    expect($response->headers->get('content-type'))->toContain('application/pdf')
        ->and($response->headers->get('content-disposition'))->toContain('.pdf')
        ->and(substr($response->getContent(), 0, 4))->toBe('%PDF');
});

it('blocks investment pdf download for another investor', function () {
    $investment = Investment::query()->create([
        'project_id' => $this->containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 2000,
        'status' => 'active',
        'reference' => 'OGEXP-OWNERONLY',
        'invested_at' => now(),
        'approved_at' => now(),
    ]);

    $other = User::factory()->create(['account_status' => 'active']);
    $other->assignRole('investor');

    KycApplication::query()->create([
        'user_id' => $other->id,
        'type' => 'individual',
        'country' => 'Pakistan',
        'status' => 'approved',
        'submitted_at' => now(),
        'reviewed_at' => now(),
    ]);

    Wallet::query()->create([
        'user_id' => $other->id,
        'currency' => 'USD',
        'available_balance' => 10000,
        'pending_balance' => 0,
    ]);

    $this->actingAs($other)
        ->get('/api/investor/investments/'.$investment->id.'/pdf')
        ->assertNotFound();
});
