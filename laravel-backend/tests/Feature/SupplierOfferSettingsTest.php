<?php

use App\Models\SupplierCertification;
use App\Models\SupplierOffer;
use App\Models\SupplierPackagingSize;
use App\Models\SupplierPaymentTerm;
use App\Models\User;
use App\Support\SupplierMarket;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SupplierOfferSettingsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SupplierOfferSettingsSeeder::class);
});

function makeSupplier(string $country = 'United Arab Emirates'): User
{
    $supplier = User::factory()->create([
        'email' => 'supplier-offer-'.uniqid().'@ogexports.com',
        'password' => 'Password@123',
        'account_status' => 'active',
    ]);
    $supplier->assignRole('supplier');
    $supplier->profile()->create([
        'company_name' => 'Demo Supplier Co',
        'country' => $country,
    ]);

    return $supplier->fresh('profile');
}

function makeAdmin(): User
{
    $admin = User::factory()->create([
        'email' => 'admin-offer-'.uniqid().'@ogexports.com',
        'password' => 'Password@123',
        'account_status' => 'active',
    ]);
    $admin->assignRole('admin');

    return $admin;
}

it('filters supplier offer settings by profile country market', function () {
    $intl = makeSupplier('United Arab Emirates');
    $pk = makeSupplier('Pakistan');

    SupplierCertification::query()->create([
        'label' => 'PSQCA',
        'market' => SupplierMarket::PAKISTAN,
        'sort_order' => 1,
        'is_active' => true,
    ]);

    $this->actingAs($intl)
        ->getJson('/api/supplier/offer-settings')
        ->assertOk()
        ->assertJsonPath('data.market', 'international')
        ->assertJsonFragment(['label' => 'HACCP'])
        ->assertJsonMissing(['label' => 'PSQCA']);

    $this->actingAs($pk)
        ->getJson('/api/supplier/offer-settings')
        ->assertOk()
        ->assertJsonPath('data.market', 'pakistan')
        ->assertJsonFragment(['label' => 'PSQCA'])
        ->assertJsonMissing(['label' => 'HACCP']);
});

it('allows admin to manage supplier certifications packaging and payment terms', function () {
    $admin = makeAdmin();

    $this->actingAs($admin)
        ->postJson('/api/admin/supplier-certifications', [
            'label' => 'Halal PK',
            'market' => 'pakistan',
            'sort_order' => 1,
            'is_active' => true,
        ])
        ->assertCreated()
        ->assertJsonPath('data.label', 'Halal PK');

    $this->actingAs($admin)
        ->postJson('/api/admin/supplier-packaging-sizes', [
            'label' => '5 KG Bag',
            'sort_order' => 99,
            'is_active' => true,
        ])
        ->assertCreated();

    $this->actingAs($admin)
        ->postJson('/api/admin/supplier-payment-terms', [
            'label' => 'Cash on Delivery',
            'market' => 'pakistan',
            'sort_order' => 1,
            'is_active' => true,
        ])
        ->assertCreated();

    expect(SupplierCertification::query()->where('label', 'Halal PK')->exists())->toBeTrue()
        ->and(SupplierPackagingSize::query()->where('label', '5 KG Bag')->exists())->toBeTrue()
        ->and(SupplierPaymentTerm::query()->where('label', 'Cash on Delivery')->exists())->toBeTrue();
});

it('accepts zero to three images and rejects more than three when storing an offer', function () {
    $supplier = makeSupplier('United Arab Emirates');

    $base = [
        'category' => 'fruits',
        'product_name' => 'Kinnow',
        'origin' => 'Sargodha',
        'specifications' => 'Grade A',
        'available_qty' => '100 MT',
        'price_fob' => '820 / MT',
        'price_unit' => 'MT',
        'moq' => '20 MT',
        'lead_time' => '7 days',
        'packaging' => '10kg carton',
        'payment_terms' => 'Cash',
        'certifications' => ['HACCP', 'Organic'],
    ];

    $this->actingAs($supplier)->postJson('/api/supplier/offers', [
        ...$base,
        'product_name' => 'Kinnow Zero',
        'images' => [],
    ])->assertCreated()
        ->assertJsonPath('data.product_name', 'Kinnow Zero');

    $this->actingAs($supplier)->postJson('/api/supplier/offers', [
        ...$base,
        'product_name' => 'Kinnow One',
        'images' => ['uploads/supplier-offers/images/a.jpg'],
        'video' => 'uploads/supplier-offers/videos/demo.mp4',
        'remarks' => 'Seasonal availability April-June',
    ])->assertCreated()
        ->assertJsonPath('data.product_name', 'Kinnow One')
        ->assertJsonPath('data.currency', 'USD')
        ->assertJsonPath('data.incoterm', 'FOB')
        ->assertJsonPath('data.video', 'uploads/supplier-offers/videos/demo.mp4');

    $this->actingAs($supplier)->postJson('/api/supplier/offers', [
        ...$base,
        'product_name' => 'Kinnow Three',
        'images' => [
            'uploads/supplier-offers/images/a.jpg',
            'uploads/supplier-offers/images/b.jpg',
            'uploads/supplier-offers/images/c.jpg',
        ],
    ])->assertCreated()
        ->assertJsonPath('data.product_name', 'Kinnow Three');

    $this->actingAs($supplier)->postJson('/api/supplier/offers', [
        ...$base,
        'product_name' => 'Kinnow Too Many',
        'images' => [
            'uploads/supplier-offers/images/a.jpg',
            'uploads/supplier-offers/images/b.jpg',
            'uploads/supplier-offers/images/c.jpg',
            'uploads/supplier-offers/images/d.jpg',
        ],
    ])->assertStatus(422);

    expect(SupplierOffer::query()->count())->toBe(3);
});

it('uploads supplier offer image and video media', function () {
    $supplier = makeSupplier();

    $image = $this->actingAs($supplier)
        ->post('/api/supplier/offers/media', [
            'type' => 'image',
            'file' => UploadedFile::fake()->image('product.jpg', 400, 300),
        ], ['Accept' => 'application/json']);

    $image->assertCreated()
        ->assertJsonPath('data.type', 'image');

    $imagePath = $image->json('data.path');
    expect($imagePath)->toStartWith('upload/supplier-offers/')
        ->and(File::exists(public_path($imagePath)))->toBeTrue();

    $video = $this->actingAs($supplier)
        ->post('/api/supplier/offers/media', [
            'type' => 'video',
            'file' => UploadedFile::fake()->create('clip.mp4', 1024, 'video/mp4'),
        ], ['Accept' => 'application/json']);

    $video->assertCreated()
        ->assertJsonPath('data.type', 'video');

    $videoPath = $video->json('data.path');
    expect($videoPath)->toStartWith('upload/supplier-offers/')
        ->and(File::exists(public_path($videoPath)))->toBeTrue();

    File::deleteDirectory(public_path('upload/supplier-offers'));
});

it('allows credentialed supplier settings requests from localhost:5000', function () {
    $origin = 'http://localhost:5000';
    $supplier = makeSupplier();

    $this->withHeaders([
        'Origin' => $origin,
        'Access-Control-Request-Method' => 'GET',
        'Access-Control-Request-Headers' => 'content-type,x-xsrf-token',
    ])->options('/api/supplier/offer-settings')
        ->assertNoContent()
        ->assertHeader('Access-Control-Allow-Origin', $origin)
        ->assertHeader('Access-Control-Allow-Credentials', 'true');

    $this->actingAs($supplier)
        ->withHeader('Origin', $origin)
        ->getJson('/api/supplier/offer-settings')
        ->assertOk()
        ->assertHeader('Access-Control-Allow-Origin', $origin)
        ->assertHeader('Access-Control-Allow-Credentials', 'true');
});
