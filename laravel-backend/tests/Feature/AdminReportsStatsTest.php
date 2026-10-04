<?php

use App\Models\Investment;
use App\Models\InvestmentProject;
use App\Models\Order;
use App\Models\Shipment;
use App\Models\User;
use App\Models\UserProfile;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->admin = User::factory()->create(['account_status' => 'active']);
    $this->admin->assignRole('admin');
});

it('returns zeroed report stats when the database has no transactional data', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/reports')
        ->assertOk();

    $data = $response->json('data');

    expect($data['kpis']['total_revenue'])->toBe(0)
        ->and($data['kpis']['orders_total'])->toBe(0)
        ->and($data['kpis']['active_buyers'])->toBe(0)
        ->and($data['kpis']['shipments_total'])->toBe(0)
        ->and($data['business_stats']['on_time_delivery_pct'])->toBe(0)
        ->and($data['business_stats']['customer_satisfaction'])->toBe(0)
        ->and($data['logistics']['on_time_rate_pct'])->toBe(0)
        ->and($data['revenue_trend'])->toHaveCount(12)
        ->and($data['quarterly_revenue'])->toHaveCount(6)
        ->and($data['investments_by_type'])->not->toBeEmpty();

    foreach ($data['investments_by_type'] as $row) {
        expect($row['raised'])->toBe(0)
            ->and($row['investors'])->toBe(0);
    }
});

it('returns live report stats from seeded orders shipments and investments', function () {
    $buyer = User::factory()->create(['account_status' => 'active']);
    $buyer->assignRole('buyer');

    UserProfile::query()->create([
        'user_id' => $buyer->id,
        'country' => 'UAE',
        'company_name' => 'Test Buyer Co',
    ]);

    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    $order = Order::query()->create([
        'order_number' => 'ORD-REP-1',
        'buyer_id' => $buyer->id,
        'status' => 'delivered',
        'payment_status' => 'paid',
        'total_value' => 50000,
        'currency' => 'USD',
        'placed_at' => now(),
    ]);

    Shipment::query()->create([
        'order_id' => $order->id,
        'buyer_id' => $buyer->id,
        'status' => 'delivered',
        'origin' => 'Karachi',
        'destination' => 'Dubai',
        'eta' => now()->addDay()->toDateString(),
        'updated_at' => now(),
    ]);

    $project = InvestmentProject::query()->create([
        'title' => 'Produce Test',
        'type' => 'produce',
        'status' => 'active',
        'target_amount' => 80000,
        'expected_return_pct' => 18,
    ]);

    Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $investor->id,
        'amount' => 8000,
        'status' => 'active',
        'invested_at' => now(),
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/reports')
        ->assertOk();

    $data = $response->json('data');

    expect($data['kpis']['total_revenue'])->toBe(50000)
        ->and($data['kpis']['orders_total'])->toBe(1)
        ->and($data['kpis']['shipments_total'])->toBe(1)
        ->and($data['business_stats']['countries_reached'])->toBe(1)
        ->and($data['logistics']['delivered'])->toBe(1);

    $produce = collect($data['investments_by_type'])->firstWhere('type_key', 'produce');
    expect($produce)->not->toBeNull()
        ->and($produce['raised'])->toBe(8000)
        ->and($produce['investors'])->toBe(1)
        ->and((float) $produce['avg_roi_pct'])->toBe(18.0);
});

it('blocks non-admin users from reports', function () {
    $buyer = User::factory()->create(['account_status' => 'active']);
    $buyer->assignRole('buyer');

    $this->actingAs($buyer)
        ->getJson('/api/admin/reports')
        ->assertStatus(403);
});
