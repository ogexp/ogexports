<?php

use App\Models\Country;
use App\Models\Port;
use App\Models\Product;
use App\Models\Rfq;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->country = Country::query()->create([
        'code' => 'AE',
        'name' => 'United Arab Emirates',
    ]);
    $this->port = Port::query()->create([
        'country_id' => $this->country->id,
        'unlocode' => 'AEJEA',
        'name' => 'Jebel Ali',
    ]);
});

it('lists countries and only ports for the selected country', function () {
    $otherCountry = Country::query()->create([
        'code' => 'NL',
        'name' => 'Netherlands',
    ]);
    Port::query()->create([
        'country_id' => $otherCountry->id,
        'unlocode' => 'NLRTM',
        'name' => 'Rotterdam',
    ]);

    $this->getJson('/api/countries')
        ->assertOk()
        ->assertJsonFragment([
            'code' => 'AE',
            'name' => 'United Arab Emirates',
            'ports_count' => 1,
        ]);

    $this->getJson("/api/countries/{$this->country->id}/ports")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.unlocode', 'AEJEA')
        ->assertJsonMissing(['unlocode' => 'NLRTM']);
});

it('allows a buyer to save a complete RFQ', function () {
    $buyer = User::factory()->create(['account_status' => 'active']);
    $buyer->assignRole('buyer');
    $product = Product::query()->create([
        'name' => 'Basmati Rice',
        'slug' => 'basmati-rice-test',
        'status' => 'approved',
    ]);
    $deliveryDate = now()->addMonth()->toDateString();

    $this->actingAs($buyer)
        ->postJson('/api/buyer/rfqs', [
            'product_id' => $product->id,
            'product_name' => $product->name,
            'qty' => '25 MT',
            'packaging' => '25 kg PP Bag',
            'country_id' => $this->country->id,
            'port_id' => $this->port->id,
            'incoterm' => 'CIF',
            'payment_terms' => 'LC at Sight',
            'required_delivery_date' => $deliveryDate,
            'notes' => 'Halal certificate required.',
        ])
        ->assertCreated()
        ->assertJsonPath('data.buyer_id', $buyer->id)
        ->assertJsonPath('data.country.code', 'AE')
        ->assertJsonPath('data.port.unlocode', 'AEJEA');

    $this->assertDatabaseHas('rfqs', [
        'buyer_id' => $buyer->id,
        'product_id' => $product->id,
        'packaging' => '25 kg PP Bag',
        'country_id' => $this->country->id,
        'port_id' => $this->port->id,
        'destination' => 'Jebel Ali, United Arab Emirates',
        'status' => 'pending',
    ]);

    expect(Rfq::query()->whereBelongsTo($buyer, 'buyer')->firstOrFail()
        ->required_delivery_date->toDateString())->toBe($deliveryDate);
});

it('rejects a port that does not belong to the selected country', function () {
    $buyer = User::factory()->create(['account_status' => 'active']);
    $buyer->assignRole('buyer');
    $otherCountry = Country::query()->create([
        'code' => 'NL',
        'name' => 'Netherlands',
    ]);
    $otherPort = Port::query()->create([
        'country_id' => $otherCountry->id,
        'unlocode' => 'NLRTM',
        'name' => 'Rotterdam',
    ]);

    $this->actingAs($buyer)
        ->postJson('/api/buyer/rfqs', [
            'product_name' => 'Basmati Rice',
            'qty' => '25 MT',
            'country_id' => $this->country->id,
            'port_id' => $otherPort->id,
            'incoterm' => 'CIF',
            'payment_terms' => 'LC at Sight',
            'required_delivery_date' => now()->addMonth()->toDateString(),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('port_id');
});

it('blocks non-buyers from creating RFQs', function () {
    $supplier = User::factory()->create(['account_status' => 'active']);
    $supplier->assignRole('supplier');

    $this->actingAs($supplier)
        ->postJson('/api/buyer/rfqs', [])
        ->assertForbidden();
});
