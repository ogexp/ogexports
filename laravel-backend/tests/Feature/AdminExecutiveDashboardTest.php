<?php

use App\Models\Country;
use App\Models\Deposit;
use App\Models\InvestmentProject;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Models\Withdrawal;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->admin = User::factory()->create(['account_status' => 'active']);
    $this->admin->assignRole('admin');
});

it('returns zeroed kpis and empty lists when the database has no transactional data', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/dashboard')
        ->assertOk();

    $data = $response->json('data');

    expect($data['buyers'])->toBe(0)
        ->and($data['orders'])->toBe(0)
        ->and($data['investments'])->toBe(0)
        ->and($data['deposits_pending'])->toBe(0);

    expect($data['kpis']['revenue']['total'])->toBe(0)
        ->and($data['kpis']['revenue']['monthly'])->toBe(0)
        ->and($data['kpis']['buyers']['total'])->toBe(0)
        ->and($data['kpis']['orders']['total'])->toBe(0)
        ->and($data['kpis']['payments']['pending'])->toBe(0)
        ->and($data['kpis']['payments']['outstanding'])->toBe(0)
        ->and($data['kpis']['inventory']['total_value'])->toBe(0);

    expect($data['period'])->toBe('month');

    expect($data['finance_summary']['total_deposits'])->toBe(0)
        ->and($data['finance_summary']['pending_deposits'])->toBe(0)
        ->and($data['finance_summary']['total_withdrawals'])->toBe(0)
        ->and($data['finance_summary']['pending_withdrawals'])->toBe(0)
        ->and($data['finance_summary']['total_deposits_count'])->toBe(0)
        ->and($data['finance_summary']['pending_deposits_count'])->toBe(0)
        ->and($data['finance_summary']['total_withdrawals_count'])->toBe(0)
        ->and($data['finance_summary']['pending_withdrawals_count'])->toBe(0);

    expect($data['container_projects_by_status']['total'])->toBe(0)
        ->and($data['container_projects_by_status']['funding'])->toBe(0)
        ->and($data['container_projects_by_status']['in_transit'])->toBe(0)
        ->and($data['container_projects_by_status']['cancelled'])->toBe(0);

    expect($data['export_pipeline'])->toBe([])
        ->and($data['top_destinations'])->toBe([])
        ->and($data['smart_notifications'])->toBe([])
        ->and($data['warehouse'])->toBe([])
        ->and($data['supplier_offers'])->toBe([])
        ->and($data['calendar_events'])->toBe([]);

    expect($data['charts']['product_performance'])->toBe([])
        ->and($data['charts']['currency_breakdown'])->toBe([])
        ->and($data['charts']['revenue_trend'])->toHaveCount(12);
});

it('returns live counts and pipeline rows from seeded transactional data', function () {
    $buyer = User::factory()->create(['account_status' => 'active', 'name' => 'Al-Futtaim Trading']);
    $buyer->assignRole('buyer');

    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    $country = Country::query()->create(['code' => 'AE', 'name' => 'United Arab Emirates']);

    $product = Product::query()->create([
        'name' => 'Basmati Rice',
        'slug' => 'basmati-rice-dash',
        'status' => 'approved',
        'sku' => 'RICE-121',
        'price' => 850,
        'stock' => 5,
    ]);

    $order = Order::query()->create([
        'order_number' => 'ORD-9001',
        'buyer_id' => $buyer->id,
        'status' => 'production',
        'payment_status' => 'pending',
        'total_value' => 425000,
        'currency' => 'USD',
        'country_id' => $country->id,
        'destination' => 'UAE',
        'placed_at' => now(),
        'required_delivery_date' => now()->addWeeks(2)->toDateString(),
    ]);

    OrderItem::query()->create([
        'order_id' => $order->id,
        'product_id' => $product->id,
        'product_name' => 'Basmati Rice',
        'qty' => '500MT',
        'unit_price' => 850,
        'line_total' => 425000,
    ]);

    Order::query()->create([
        'order_number' => 'ORD-9002',
        'buyer_id' => $buyer->id,
        'status' => 'delivered',
        'payment_status' => 'paid',
        'total_value' => 100000,
        'currency' => 'USD',
        'country_id' => $country->id,
        'destination' => 'UAE',
        'placed_at' => now()->subDays(3),
    ]);

    Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 5000,
        'currency' => 'USD',
        'method' => 'bank_transfer',
        'reference' => 'DEP-TEST-1',
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/dashboard')
        ->assertOk();

    $data = $response->json('data');

    expect($data['buyers'])->toBe(1)
        ->and($data['orders'])->toBe(2)
        ->and($data['deposits_pending'])->toBe(1)
        ->and($data['kpis']['buyers']['total'])->toBe(1)
        ->and($data['kpis']['orders']['total'])->toBe(2)
        ->and($data['kpis']['orders']['active'])->toBe(1)
        ->and($data['kpis']['orders']['completed'])->toBe(1)
        ->and($data['kpis']['revenue']['total'])->toBe(100000)
        ->and($data['kpis']['inventory']['low_stock_alerts'])->toBe(1)
        ->and($data['kpis']['inventory']['total_value'])->toEqual(4250)
        ->and($data['kpis']['payments']['outstanding'])->toBe(425000);

    expect($data['export_pipeline'])->toHaveCount(1)
        ->and($data['export_pipeline'][0]['id'])->toBe('ORD-9001')
        ->and($data['export_pipeline'][0]['buyer'])->toBe('Al-Futtaim Trading')
        ->and($data['export_pipeline'][0]['product'])->toBe('Basmati Rice')
        ->and($data['export_pipeline'][0]['value'])->toBe(425000);

    expect($data['top_destinations'])->not->toBeEmpty()
        ->and($data['top_destinations'][0]['orders'])->toBe(2);

    expect($data['warehouse'])->not->toBeEmpty()
        ->and($data['smart_notifications'])->not->toBeEmpty();

    expect($data['finance_summary']['pending_deposits'])->toEqual(5000)
        ->and($data['finance_summary']['total_deposits'])->toEqual(0)
        ->and($data['finance_summary']['pending_deposits_count'])->toBe(1)
        ->and($data['finance_summary']['total_deposits_count'])->toBe(0);
});

it('returns finance summary amounts and normalized container project status counts', function () {
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 10000,
        'currency' => 'USD',
        'method' => 'bank_transfer',
        'reference' => 'DEP-APPR-1',
        'status' => 'approved',
    ]);
    Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 2500,
        'converted_amount' => 2500,
        'currency' => 'USD',
        'method' => 'bank_transfer',
        'reference' => 'DEP-PEND-1',
        'status' => 'pending',
    ]);

    Withdrawal::query()->create([
        'investor_id' => $investor->id,
        'amount' => 3000,
        'bank_details' => ['bank_name' => 'HBL', 'account_number' => '111'],
        'reference' => 'WD-APPR-1',
        'status' => 'approved',
    ]);
    Withdrawal::query()->create([
        'investor_id' => $investor->id,
        'amount' => 800,
        'bank_details' => ['bank_name' => 'HBL', 'account_number' => '222'],
        'reference' => 'WD-PEND-1',
        'status' => 'pending',
    ]);
    Withdrawal::query()->create([
        'investor_id' => $investor->id,
        'amount' => 200,
        'bank_details' => ['bank_name' => 'HBL', 'account_number' => '333'],
        'reference' => 'WD-REV-1',
        'status' => 'review',
    ]);

    // Mixed modern + legacy statuses — legacy values must normalize
    foreach ([
        ['title' => 'Funding Project', 'status' => 'funding'],
        ['title' => 'Legacy Active', 'status' => 'active'], // → investment_confirmed
        ['title' => 'In Transit', 'status' => 'in_transit'],
        ['title' => 'Legacy Shipping', 'status' => 'shipping'], // → in_transit
        ['title' => 'Settled', 'status' => 'settled'],
        ['title' => 'Legacy Completed', 'status' => 'completed'], // → settled
        ['title' => 'Cancelled', 'status' => 'cancelled'],
        ['title' => 'Non Container', 'status' => 'funding', 'type' => 'produce'],
    ] as $row) {
        InvestmentProject::query()->create([
            'title' => $row['title'],
            'type' => $row['type'] ?? 'container',
            'status' => $row['status'],
            'target_amount' => 10000,
            'raised_amount' => 0,
            'investors_count' => 0,
        ]);
    }

    $data = $this->actingAs($this->admin)
        ->getJson('/api/admin/dashboard')
        ->assertOk()
        ->json('data');

    expect($data['finance_summary']['total_deposits'])->toEqual(10000)
        ->and($data['finance_summary']['pending_deposits'])->toEqual(2500)
        ->and($data['finance_summary']['total_withdrawals'])->toEqual(3000)
        ->and($data['finance_summary']['pending_withdrawals'])->toEqual(1000)
        ->and($data['finance_summary']['total_deposits_count'])->toBe(1)
        ->and($data['finance_summary']['pending_deposits_count'])->toBe(1)
        ->and($data['finance_summary']['total_withdrawals_count'])->toBe(1)
        ->and($data['finance_summary']['pending_withdrawals_count'])->toBe(2)
        ->and($data['kpis']['payments']['completed'])->toEqual(10000);

    $byStatus = $data['container_projects_by_status'];
    expect($byStatus['total'])->toBe(7)
        ->and($byStatus['funding'])->toBe(1)
        ->and($byStatus['investment_confirmed'])->toBe(1)
        ->and($byStatus['in_transit'])->toBe(2)
        ->and($byStatus['settled'])->toBe(2)
        ->and($byStatus['cancelled'])->toBe(1)
        ->and($byStatus['cargo_loaded'])->toBe(0)
        ->and($byStatus['custom_clearance'])->toBe(0);
});

it('uses converted_amount for deposit totals so finance_summary matches kpis.payments.completed', function () {
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    // PKR deposit converted to wallet USD
    Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 280000,
        'converted_amount' => 1000,
        'currency' => 'PKR',
        'wallet_currency' => 'USD',
        'exchange_rate' => 280,
        'method' => 'bank_transfer',
        'reference' => 'DEP-FX-1',
        'status' => 'approved',
    ]);
    Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 500,
        'converted_amount' => null,
        'currency' => 'USD',
        'method' => 'bank_transfer',
        'reference' => 'DEP-FX-2',
        'status' => 'completed',
    ]);
    Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 140000,
        'converted_amount' => 500,
        'currency' => 'PKR',
        'method' => 'bank_transfer',
        'reference' => 'DEP-FX-PEND',
        'status' => 'pending',
    ]);

    $data = $this->actingAs($this->admin)
        ->getJson('/api/admin/dashboard')
        ->assertOk()
        ->json('data');

    // 1000 (converted) + 500 (raw amount) = 1500
    expect($data['finance_summary']['total_deposits'])->toEqual(1500)
        ->and($data['kpis']['payments']['completed'])->toEqual(1500)
        ->and($data['finance_summary']['pending_deposits'])->toEqual(500)
        ->and($data['finance_summary']['total_deposits_count'])->toBe(2)
        ->and($data['finance_summary']['pending_deposits_count'])->toBe(1);
});

it('computes inventory total_value from approved stock × price', function () {
    Product::query()->create([
        'name' => 'Sesame Seeds',
        'slug' => 'sesame-dash-inv',
        'status' => 'approved',
        'sku' => 'SES-1',
        'price' => 100,
        'stock' => 10,
    ]);
    Product::query()->create([
        'name' => 'Maize',
        'slug' => 'maize-dash-inv',
        'status' => 'approved',
        'sku' => 'MZ-1',
        'fob' => 50,
        'stock' => 20,
    ]);
    // Pending product must be excluded
    Product::query()->create([
        'name' => 'Pending Rice',
        'slug' => 'pending-rice-inv',
        'status' => 'pending',
        'sku' => 'R-PEND',
        'price' => 999,
        'stock' => 100,
    ]);

    $data = $this->actingAs($this->admin)
        ->getJson('/api/admin/dashboard')
        ->assertOk()
        ->json('data');

    // 10*100 + 20*50 = 2000
    expect($data['kpis']['inventory']['total_value'])->toEqual(2000)
        ->and($data['kpis']['inventory']['warehouse_items'])->toBe(2);
});

it('accepts period query and scopes period revenue label', function () {
    $buyer = User::factory()->create(['account_status' => 'active']);
    $buyer->assignRole('buyer');

    Order::query()->create([
        'order_number' => 'ORD-PERIOD-1',
        'buyer_id' => $buyer->id,
        'status' => 'delivered',
        'payment_status' => 'paid',
        'total_value' => 7500,
        'currency' => 'USD',
        'placed_at' => now(),
    ]);
    Order::query()->create([
        'order_number' => 'ORD-PERIOD-OLD',
        'buyer_id' => $buyer->id,
        'status' => 'delivered',
        'payment_status' => 'paid',
        'total_value' => 2000,
        'currency' => 'USD',
        'placed_at' => now()->subMonths(2),
    ]);

    $data = $this->actingAs($this->admin)
        ->getJson('/api/admin/dashboard?period=year')
        ->assertOk()
        ->json('data');

    expect($data['period'])->toBe('year')
        ->and($data['kpis']['revenue']['total'])->toEqual(9500)
        ->and($data['kpis']['revenue']['monthly'])->toEqual(9500);
});

it('blocks non-admin users from the executive dashboard endpoint', function () {
    $buyer = User::factory()->create(['account_status' => 'active']);
    $buyer->assignRole('buyer');

    $this->actingAs($buyer)
        ->getJson('/api/admin/dashboard')
        ->assertStatus(403);
});
