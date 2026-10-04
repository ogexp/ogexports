<?php

use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

function adminUser(): User
{
    $admin = User::factory()->create([
        'email' => 'admin-images@ogexports.com',
        'password' => 'Password@123',
        'account_status' => 'active',
    ]);
    $admin->assignRole('admin');

    return $admin;
}

it('blocks non-admin from product image upload', function () {
    $buyer = User::factory()->create(['account_status' => 'active']);
    $buyer->assignRole('buyer');

    $this->actingAs($buyer)
        ->post('/api/admin/products/images', [
            'title' => 'Basmati Rice',
            'images' => [UploadedFile::fake()->image('rice.jpg')],
        ], ['Accept' => 'application/json'])
        ->assertStatus(403);
});

it('uploads product images to the public product_images folder with unique time-based names', function () {
    $admin = adminUser();
    $directory = public_path('product_images');
    File::ensureDirectoryExists($directory);

    $before = collect(File::files($directory))->map->getFilename()->all();

    $response = $this->actingAs($admin)
        ->post('/api/admin/products/images', [
            'title' => 'Basmati Rice 1121',
            'images' => [
                UploadedFile::fake()->image('primary.jpg', 400, 300),
                UploadedFile::fake()->image('gallery.png', 400, 300),
            ],
        ], ['Accept' => 'application/json']);

    $response->assertCreated()
        ->assertJsonStructure(['data' => ['paths']]);

    $paths = $response->json('data.paths');
    expect($paths)->toHaveCount(2);

    foreach ($paths as $path) {
        expect($path)->toStartWith('product_images/')
            ->and($path)->not->toContain('http')
            ->and($path)->toMatch('/basmati-rice-1121-\d+-\d+-[a-z0-9]+\.(jpg|png)$/');

        expect(File::isFile(public_path($path)))->toBeTrue();
    }

    // Cleanup newly created files from this test
    foreach ($paths as $path) {
        File::delete(public_path($path));
    }

    // Restore prior files if any were present
    foreach ($before as $name) {
        // no-op: we only delete files we created
    }
});

it('rejects non-image uploads', function () {
    $admin = adminUser();

    $this->actingAs($admin)
        ->post('/api/admin/products/images', [
            'title' => 'Invalid File',
            'images' => [UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf')],
        ], ['Accept' => 'application/json'])
        ->assertStatus(422);
});

it('stores relative image paths when creating a product', function () {
    $admin = adminUser();

    $response = $this->actingAs($admin)->postJson('/api/admin/products', [
        'name' => 'Kinnow Mandarin',
        'sku' => 'FRUIT-KIN-01',
        'status' => 'approved',
        'image_url' => 'product_images/kinnow-mandarin-1710000000-0-abc123.jpg',
        'media' => [
            ['url' => 'product_images/kinnow-mandarin-1710000000-1-def456.jpg', 'type' => 'image', 'sort_order' => 0],
        ],
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.image_url', 'product_images/kinnow-mandarin-1710000000-0-abc123.jpg')
        ->assertJsonPath('data.media.0.url', 'product_images/kinnow-mandarin-1710000000-1-def456.jpg');

    $this->assertDatabaseHas('products', [
        'name' => 'Kinnow Mandarin',
        'image_url' => 'product_images/kinnow-mandarin-1710000000-0-abc123.jpg',
    ]);
});

it('deletes replaced local product images during update', function () {
    $admin = adminUser();
    File::ensureDirectoryExists(public_path('product_images'));

    $oldPrimary = 'product_images/old-primary.jpg';
    $oldGallery = 'product_images/old-gallery.jpg';
    $newPrimary = 'product_images/new-primary.jpg';
    File::put(public_path($oldPrimary), 'old-primary');
    File::put(public_path($oldGallery), 'old-gallery');
    File::put(public_path($newPrimary), 'new-primary');

    $product = Product::create([
        'name' => 'Image Update Product',
        'slug' => 'image-update-product',
        'status' => 'approved',
        'image_url' => $oldPrimary,
        'created_by' => $admin->id,
    ]);
    ProductMedia::create([
        'product_id' => $product->id,
        'url' => $oldGallery,
        'type' => 'image',
        'sort_order' => 0,
    ]);

    $this->actingAs($admin)->putJson("/api/admin/products/{$product->id}", [
        'image_url' => $newPrimary,
        'media' => [],
    ])->assertOk();

    expect(File::exists(public_path($oldPrimary)))->toBeFalse()
        ->and(File::exists(public_path($oldGallery)))->toBeFalse()
        ->and(File::exists(public_path($newPrimary)))->toBeTrue();

    File::delete(public_path($newPrimary));
});

it('migrates legacy product images and database paths', function () {
    $legacyDirectory = storage_path('app/public/products');
    File::ensureDirectoryExists($legacyDirectory);
    File::put($legacyDirectory.'/legacy-primary.jpg', 'primary-image');
    File::put($legacyDirectory.'/legacy-gallery.png', 'gallery-image');

    $product = Product::create([
        'name' => 'Legacy Product',
        'slug' => 'legacy-product',
        'status' => 'approved',
        'image_url' => 'products/legacy-primary.jpg',
    ]);
    $media = ProductMedia::create([
        'product_id' => $product->id,
        'url' => 'products/legacy-gallery.png',
        'type' => 'image',
        'sort_order' => 0,
    ]);

    $this->artisan('products:migrate-images')->assertSuccessful();

    $product->refresh();
    $media->refresh();

    expect($product->image_url)->toStartWith('product_images/')
        ->and($media->url)->toStartWith('product_images/')
        ->and(File::isFile(public_path($product->image_url)))->toBeTrue()
        ->and(File::isFile(public_path($media->url)))->toBeTrue();

    File::delete([
        public_path($product->image_url),
        public_path($media->url),
        $legacyDirectory.'/legacy-primary.jpg',
        $legacyDirectory.'/legacy-gallery.png',
    ]);
});
