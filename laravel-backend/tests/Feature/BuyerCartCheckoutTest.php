<?php

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Country;
use App\Models\Order;
use App\Models\Port;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\PaymentMethodSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->seed(PaymentMethodSeeder::class);

    $this->buyer = User::factory()->create(['account_status' => 'active']);
    $this->buyer->assignRole('buyer');

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
        'name' => 'IQF Potato Sticks',
        'slug' => 'iqf-potato-sticks-test',
        'status' => 'approved',
        'price' => 1100,
    ]);

    $this->cart = Cart::query()->create(['user_id' => $this->buyer->id]);
    CartItem::query()->create([
        'cart_id' => $this->cart->id,
        'product_id' => $this->product->id,
        'qty' => 10,
        'unit_price' => 1100,
    ]);

    $this->checkoutPayload = [
        'payment_method' => 'lc',
        'destination_country_id' => $this->country->id,
        'destination_port_id' => $this->port->id,
        'incoterm' => 'FOB',
        'required_delivery_date' => now()->addMonth()->toDateString(),
    ];
});

it('places an order, clears the cart, and rejects a second checkout while empty', function () {
    $this->actingAs($this->buyer)
        ->postJson('/api/buyer/cart/checkout', $this->checkoutPayload)
        ->assertCreated()
        ->assertJsonPath('data.buyer_id', $this->buyer->id)
        ->assertJsonPath('data.payment_status', 'unpaid');

    expect(Order::query()->where('buyer_id', $this->buyer->id)->count())->toBe(1);
    expect(CartItem::query()->where('cart_id', $this->cart->id)->count())->toBe(0);

    $this->actingAs($this->buyer)
        ->postJson('/api/buyer/cart/checkout', $this->checkoutPayload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('cart');

    expect(Order::query()->where('buyer_id', $this->buyer->id)->count())->toBe(1);
});

it('rejects non-FOB checkout', function () {
    $this->actingAs($this->buyer)
        ->postJson('/api/buyer/cart/checkout', [
            ...$this->checkoutPayload,
            'incoterm' => 'CIF',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('incoterm');

    expect(Order::query()->where('buyer_id', $this->buyer->id)->count())->toBe(0);
    expect(CartItem::query()->where('cart_id', $this->cart->id)->count())->toBe(1);
});

it('rejects duplicate payment submission for the same order', function () {
    $order = Order::query()->create([
        'order_number' => 'ORD-TESTDUP1',
        'buyer_id' => $this->buyer->id,
        'status' => 'order_confirmed',
        'payment_status' => 'unpaid',
        'payment_method' => 'Letter of Credit (LC at Sight)',
        'total_value' => 11000,
        'currency' => 'USD',
        'placed_at' => now(),
    ]);

    $payload = [
        'payment_method' => 'lc',
        'payment_field1' => 'Emirates NBD',
        'reference' => 'LC-123',
        'notes' => 'Submitted',
    ];

    $this->actingAs($this->buyer)
        ->postJson("/api/buyer/payments/orders/{$order->id}/mark-paid", $payload)
        ->assertOk()
        ->assertJsonPath('data.payment_status', 'pending_verification');

    $this->actingAs($this->buyer)
        ->postJson("/api/buyer/payments/orders/{$order->id}/mark-paid", $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('payment_status');

    expect(Order::query()->whereKey($order->id)->value('payment_status'))->toBe('pending_verification');
});
