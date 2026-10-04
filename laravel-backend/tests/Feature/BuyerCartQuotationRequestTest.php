<?php

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Country;
use App\Models\Order;
use App\Models\Port;
use App\Models\Product;
use App\Models\Rfq;
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
        'code' => 'AF',
        'name' => 'Afghanistan',
    ]);
    $this->port = Port::query()->create([
        'country_id' => $this->country->id,
        'unlocode' => 'AFDHD',
        'name' => 'Dehdadi',
    ]);

    $this->productA = Product::query()->create([
        'name' => 'Fresh Vegetables',
        'slug' => 'fresh-vegetables-quote-test',
        'status' => 'approved',
        'price' => 600,
    ]);
    $this->productB = Product::query()->create([
        'name' => 'Fresh Mangoes',
        'slug' => 'fresh-mangoes-quote-test',
        'status' => 'approved',
        'price' => 850,
    ]);

    $this->cart = Cart::query()->create(['user_id' => $this->buyer->id]);
    CartItem::query()->create([
        'cart_id' => $this->cart->id,
        'product_id' => $this->productA->id,
        'qty' => 120,
        'unit_price' => 600,
    ]);
    CartItem::query()->create([
        'cart_id' => $this->cart->id,
        'product_id' => $this->productB->id,
        'qty' => 50,
        'unit_price' => 850,
    ]);

    $this->quotePayload = [
        'destination_country_id' => $this->country->id,
        'destination_port_id' => $this->port->id,
        'incoterm' => 'CIF',
        'required_delivery_date' => now()->addMonth()->toDateString(),
        'notes' => 'Need fumigation certificate',
    ];
});

it('creates an RFQ per cart line for non-FOB and clears the cart', function () {
    $response = $this->actingAs($this->buyer)
        ->postJson('/api/buyer/cart/request-quotation', $this->quotePayload)
        ->assertCreated()
        ->assertJsonPath('message', 'Quotation request submitted. Our team will contact you soon.');

    $rfqs = $response->json('data.rfqs');
    expect($rfqs)->toHaveCount(2);
    expect(Rfq::query()->where('buyer_id', $this->buyer->id)->count())->toBe(2);
    expect(CartItem::query()->where('cart_id', $this->cart->id)->count())->toBe(0);
    expect(Order::query()->where('buyer_id', $this->buyer->id)->count())->toBe(0);

    $created = Rfq::query()->where('buyer_id', $this->buyer->id)->get();
    expect($created->pluck('incoterm')->unique()->values()->all())->toBe(['CIF']);
    expect($created->pluck('payment_terms')->unique()->values()->all())->toBe(['To be agreed']);
    expect($created->pluck('status')->unique()->values()->all())->toBe(['pending']);
});

it('rejects FOB on request-quotation', function () {
    $this->actingAs($this->buyer)
        ->postJson('/api/buyer/cart/request-quotation', [
            ...$this->quotePayload,
            'incoterm' => 'FOB',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('incoterm');

    expect(Rfq::query()->where('buyer_id', $this->buyer->id)->count())->toBe(0);
    expect(CartItem::query()->where('cart_id', $this->cart->id)->count())->toBe(2);
});

it('still allows FOB checkout after quotation endpoint exists', function () {
    CartItem::query()->where('cart_id', $this->cart->id)->delete();
    CartItem::query()->create([
        'cart_id' => $this->cart->id,
        'product_id' => $this->productA->id,
        'qty' => 10,
        'unit_price' => 600,
    ]);

    $this->actingAs($this->buyer)
        ->postJson('/api/buyer/cart/checkout', [
            'payment_method' => 'lc',
            'destination_country_id' => $this->country->id,
            'destination_port_id' => $this->port->id,
            'incoterm' => 'FOB',
            'required_delivery_date' => now()->addMonth()->toDateString(),
        ])
        ->assertCreated();

    expect(Order::query()->where('buyer_id', $this->buyer->id)->count())->toBe(1);
    expect(Rfq::query()->where('buyer_id', $this->buyer->id)->count())->toBe(0);
});

it('rejects empty cart on request-quotation', function () {
    CartItem::query()->where('cart_id', $this->cart->id)->delete();

    $this->actingAs($this->buyer)
        ->postJson('/api/buyer/cart/request-quotation', $this->quotePayload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('cart');
});
