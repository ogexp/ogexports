<?php

use App\Models\Order;
use App\Models\TradeDocument;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->buyer = User::factory()->create([
        'account_status' => 'active',
        'name' => 'Download Buyer',
        'email' => 'downloadbuyer@test.com',
    ]);
    $this->buyer->assignRole('buyer');
});

afterEach(function () {
    $dir = public_path('upload/trade-documents');
    if (File::isDirectory($dir)) {
        File::deleteDirectory($dir);
    }
});

it('downloads an available buyer trade document', function () {
    $path = 'upload/trade-documents/downloadable.pdf';
    File::ensureDirectoryExists(public_path('upload/trade-documents'));
    File::put(public_path($path), 'fake-pdf-content');

    $doc = TradeDocument::query()->create([
        'buyer_id' => $this->buyer->id,
        'order_id' => null,
        'shipment_id' => null,
        'type' => 'Commercial Invoice',
        'title' => 'Commercial Invoice',
        'path' => $path,
    ]);

    $this->actingAs($this->buyer)
        ->get("/api/buyer/documents/{$doc->id}/download")
        ->assertOk()
        ->assertHeader('content-disposition');

    $this->actingAs($this->buyer)
        ->getJson('/api/buyer/documents')
        ->assertOk()
        ->assertJsonPath('data.0.status', 'available')
        ->assertJsonPath('data.0.download_url', "/api/buyer/documents/{$doc->id}/download");
});

it('returns 404 when the document file is missing', function () {
    $doc = TradeDocument::query()->create([
        'buyer_id' => $this->buyer->id,
        'order_id' => null,
        'shipment_id' => null,
        'type' => 'Packing List',
        'title' => 'Packing List',
        'path' => 'upload/trade-documents/missing-file.pdf',
    ]);

    $this->actingAs($this->buyer)
        ->getJson("/api/buyer/documents/{$doc->id}/download")
        ->assertNotFound()
        ->assertJsonPath('message', 'File not found.');

    $this->actingAs($this->buyer)
        ->getJson('/api/buyer/documents')
        ->assertOk()
        ->assertJsonPath('data.0.status', 'pending');
});

it('allows download of an order-linked document owned via the order relation', function () {
    $path = 'upload/trade-documents/order-linked.pdf';
    File::ensureDirectoryExists(public_path('upload/trade-documents'));
    File::put(public_path($path), 'order-linked-content');

    $otherBuyer = User::factory()->create([
        'account_status' => 'active',
        'email' => 'otherbuyer@test.com',
    ]);
    $otherBuyer->assignRole('buyer');

    $order = Order::query()->create([
        'order_number' => 'PO-DOC-001',
        'buyer_id' => $this->buyer->id,
        'status' => 'confirmed',
        'payment_status' => 'unpaid',
        'total_value' => 1000,
        'currency' => 'USD',
        'destination' => 'Test Port',
        'placed_at' => now(),
    ]);

    // Document row may carry a different buyer_id; ownership still resolves via order.buyer_id.
    $doc = TradeDocument::query()->create([
        'buyer_id' => $otherBuyer->id,
        'order_id' => $order->id,
        'shipment_id' => null,
        'type' => 'Bill of Lading',
        'title' => 'Bill of Lading',
        'path' => $path,
    ]);

    $this->actingAs($this->buyer)
        ->get("/api/buyer/documents/{$doc->id}/download")
        ->assertOk();

    $this->actingAs($this->buyer)
        ->getJson("/api/buyer/orders/{$order->id}")
        ->assertOk()
        ->assertJsonPath('data.trade_documents.0.status', 'available')
        ->assertJsonPath('data.trade_documents.0.download_url', "/api/buyer/documents/{$doc->id}/download");
});
