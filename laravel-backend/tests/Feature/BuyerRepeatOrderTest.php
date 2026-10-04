<?php

use App\Models\Country;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Port;
use App\Models\Product;
use App\Models\Rfq;
use App\Models\User;
use App\Support\OrderStatuses;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->buyer = User::factory()->create(['account_status' => 'active']);
    $this->buyer->assignRole('buyer');

    $this->otherBuyer = User::factory()->create(['account_status' => 'active']);
    $this->otherBuyer->assignRole('buyer');

    $this->country = Country::query()->create([
        'code' => 'AE',
        'name' => 'United Arab Emirates',
    ]);
    $this->port = Port::query()->create([
        'country_id' => $this->country->id,
        'unlocode' => 'AEJEA',
        'name' => 'Jebel Ali',
    ]);

    $this->product = Product::query()->create([
        'name' => 'Basmati Rice',
        'slug' => 'basmati-rice-repeat-test',
        'status' => 'approved',
        'price' => 1200,
    ]);

    $this->order = Order::query()->create([
        'order_number' => 'ORD-REPEAT-1',
        'buyer_id' => $this->buyer->id,
        'status' => OrderStatuses::DELIVERED,
        'payment_status' => 'paid',
        'total_value' => 12000,
        'currency' => 'USD',
        'country_id' => $this->country->id,
        'port_id' => $this->port->id,
        'destination' => 'Jebel Ali, United Arab Emirates',
        'incoterm' => 'CIF',
        'placed_at' => now(),
    ]);

    $this->item = OrderItem::query()->create([
        'order_id' => $this->order->id,
        'product_id' => $this->product->id,
        'product_name' => $this->product->name,
        'qty' => 10,
        'unit_price' => 1200,
        'line_total' => 12000,
    ]);
});

it('creates an RFQ from an order with a custom quantity', function () {
    $this->actingAs($this->buyer)
        ->postJson("/api/buyer/orders/{$this->order->id}/repeat", [
            'items' => [
                ['id' => $this->item->id, 'qty' => 25],
            ],
        ])
        ->assertCreated()
        ->assertJsonPath('data.buyer_id', $this->buyer->id)
        ->assertJsonPath('data.product_id', $this->product->id)
        ->assertJsonPath('data.qty', '25 MT')
        ->assertJsonPath('data.country_id', $this->country->id)
        ->assertJsonPath('data.port_id', $this->port->id)
        ->assertJsonPath('data.incoterm', 'CIF')
        ->assertJsonPath('data.status', 'pending');

    $this->assertDatabaseHas('rfqs', [
        'buyer_id' => $this->buyer->id,
        'product_id' => $this->product->id,
        'qty' => '25 MT',
        'notes' => 'Repeat of order ORD-REPEAT-1',
    ]);
});

it('creates an RFQ from the first item when no body is sent', function () {
    $this->actingAs($this->buyer)
        ->postJson("/api/buyer/orders/{$this->order->id}/repeat")
        ->assertCreated()
        ->assertJsonPath('data.qty', '10 MT');

    expect(Rfq::query()->where('buyer_id', $this->buyer->id)->count())->toBe(1);
});

it('rejects an item id that does not belong to the order', function () {
    $foreignOrder = Order::query()->create([
        'order_number' => 'ORD-OTHER',
        'buyer_id' => $this->otherBuyer->id,
        'status' => OrderStatuses::DELIVERED,
        'total_value' => 100,
        'currency' => 'USD',
        'placed_at' => now(),
    ]);
    $foreignItem = OrderItem::query()->create([
        'order_id' => $foreignOrder->id,
        'product_id' => $this->product->id,
        'product_name' => 'Other Item',
        'qty' => 5,
        'unit_price' => 20,
        'line_total' => 100,
    ]);

    $this->actingAs($this->buyer)
        ->postJson("/api/buyer/orders/{$this->order->id}/repeat", [
            'items' => [
                ['id' => $foreignItem->id, 'qty' => 3],
            ],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('items.0.id');
});

it('rejects invalid quantity values', function () {
    $this->actingAs($this->buyer)
        ->postJson("/api/buyer/orders/{$this->order->id}/repeat", [
            'items' => [
                ['id' => $this->item->id, 'qty' => 0],
            ],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('items.0.qty');
});

it('returns not found when another buyer tries to repeat the order', function () {
    $this->actingAs($this->otherBuyer)
        ->postJson("/api/buyer/orders/{$this->order->id}/repeat", [
            'items' => [
                ['id' => $this->item->id, 'qty' => 12],
            ],
        ])
        ->assertNotFound();
});

it('creates multiple RFQs when repeating multiple line items', function () {
    $second = Product::query()->create([
        'name' => 'Sesame Seeds',
        'slug' => 'sesame-seeds-repeat-test',
        'status' => 'approved',
        'price' => 800,
    ]);
    $item2 = OrderItem::query()->create([
        'order_id' => $this->order->id,
        'product_id' => $second->id,
        'product_name' => $second->name,
        'qty' => 8,
        'unit_price' => 800,
        'line_total' => 6400,
    ]);

    $this->actingAs($this->buyer)
        ->postJson("/api/buyer/orders/{$this->order->id}/repeat", [
            'items' => [
                ['id' => $this->item->id, 'qty' => 15],
                ['id' => $item2->id, 'qty' => 4],
            ],
        ])
        ->assertCreated()
        ->assertJsonCount(2, 'data');

    expect(Rfq::query()->where('buyer_id', $this->buyer->id)->count())->toBe(2);
    $this->assertDatabaseHas('rfqs', ['product_name' => 'Basmati Rice', 'qty' => '15 MT']);
    $this->assertDatabaseHas('rfqs', ['product_name' => 'Sesame Seeds', 'qty' => '4 MT']);
});
