<?php

use App\Models\Order;
use App\Models\Shipment;
use App\Models\TradeDocument;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->admin = User::factory()->create([
        'account_status' => 'active',
        'name' => 'Docs Admin',
        'email' => 'docsadmin@test.com',
    ]);
    $this->admin->assignRole('admin');

    $this->buyer = User::factory()->create([
        'account_status' => 'active',
        'name' => 'Docs Buyer',
        'email' => 'docsbuyer@test.com',
    ]);
    $this->buyer->assignRole('buyer');

    $this->order = Order::query()->create([
        'order_number' => 'ORD-DOC-UPSERT',
        'buyer_id' => $this->buyer->id,
        'status' => 'confirmed',
        'payment_status' => 'unpaid',
        'total_value' => 5000,
        'currency' => 'USD',
        'destination' => 'Rotterdam',
        'placed_at' => now(),
    ]);

    $this->shipment = Shipment::query()->create([
        'order_id' => $this->order->id,
        'buyer_id' => $this->buyer->id,
        'product_snapshot' => 'Sesame Seeds',
        'status' => 'pending',
        'current_milestone' => 'Awaiting Booking',
        'origin' => 'Karachi, PK',
        'destination' => 'Rotterdam',
    ]);
});

afterEach(function () {
    $dir = public_path('upload/trade-documents');
    if (File::isDirectory($dir)) {
        File::deleteDirectory($dir);
    }
});

function putTradeDoc(string $relativePath, string $contents = 'pdf'): string
{
    File::ensureDirectoryExists(public_path('upload/trade-documents'));
    File::put(public_path($relativePath), $contents);

    return $relativePath;
}

it('replaces an existing order document of the same type instead of creating a duplicate', function () {
    $path1 = putTradeDoc('upload/trade-documents/coo-1.pdf', 'v1');
    $path2 = putTradeDoc('upload/trade-documents/coo-2.pdf', 'v2');

    $this->actingAs($this->admin)
        ->postJson("/api/admin/orders/{$this->order->id}/documents", [
            'type' => 'Certificate of Origin',
            'title' => 'Certificate of Origin',
            'path' => $path1,
        ])
        ->assertCreated()
        ->assertJsonPath('data.type', 'Certificate of Origin');

    $this->actingAs($this->admin)
        ->postJson("/api/admin/orders/{$this->order->id}/documents", [
            'type' => 'Certificate of Origin',
            'title' => 'Certificate of Origin',
            'path' => $path2,
        ])
        ->assertOk()
        ->assertJsonPath('data.path', $path2);

    expect(TradeDocument::query()
        ->where('order_id', $this->order->id)
        ->where('type', 'Certificate of Origin')
        ->count())->toBe(1);

    expect(File::exists(public_path($path1)))->toBeFalse();
    expect(File::exists(public_path($path2)))->toBeTrue();
});

it('returns one row per type when listing order documents with legacy duplicates', function () {
    putTradeDoc('upload/trade-documents/legacy-a.pdf');
    putTradeDoc('upload/trade-documents/legacy-b.pdf');

    TradeDocument::query()->create([
        'order_id' => $this->order->id,
        'shipment_id' => $this->shipment->id,
        'buyer_id' => $this->buyer->id,
        'type' => 'Bill of Lading',
        'title' => 'Bill of Lading old',
        'path' => 'upload/trade-documents/legacy-a.pdf',
        'created_at' => now()->subDay(),
    ]);
    TradeDocument::query()->create([
        'order_id' => $this->order->id,
        'shipment_id' => $this->shipment->id,
        'buyer_id' => $this->buyer->id,
        'type' => 'Bill of Lading',
        'title' => 'Bill of Lading new',
        'path' => 'upload/trade-documents/legacy-b.pdf',
        'created_at' => now(),
    ]);

    $this->actingAs($this->admin)
        ->getJson("/api/admin/orders/{$this->order->id}/documents")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Bill of Lading new');
});

it('upserts the same type when uploaded via shipment after order upload', function () {
    $path1 = putTradeDoc('upload/trade-documents/order-bl.pdf', 'order');
    $path2 = putTradeDoc('upload/trade-documents/ship-bl.pdf', 'ship');

    $this->actingAs($this->admin)
        ->postJson("/api/admin/orders/{$this->order->id}/documents", [
            'type' => 'Bill of Lading',
            'path' => $path1,
        ])
        ->assertCreated();

    $this->actingAs($this->admin)
        ->postJson("/api/admin/shipments/{$this->shipment->id}/documents", [
            'type' => 'Bill of Lading',
            'path' => $path2,
        ])
        ->assertOk()
        ->assertJsonPath('data.path', $path2)
        ->assertJsonPath('data.shipment_id', $this->shipment->id);

    expect(TradeDocument::query()
        ->where('type', 'Bill of Lading')
        ->where(function ($q) {
            $q->where('order_id', $this->order->id)
                ->orWhere('shipment_id', $this->shipment->id);
        })
        ->count())->toBe(1);
});
