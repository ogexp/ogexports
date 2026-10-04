<?php

use App\Models\Product;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

afterEach(function () {
    foreach (['upload', 'downloads'] as $root) {
        $path = public_path($root);
        if (File::isDirectory($path)) {
            File::deleteDirectory($path);
        }
    }

    // Keep the public downloads/reports directory scaffold for local/dev use.
    File::ensureDirectoryExists(public_path('downloads/reports'));
    File::put(public_path('downloads/reports/.gitkeep'), '');
});

it('downloads the product report for an approved product with a lab report', function () {
    $relativePath = 'downloads/reports/premium-basmati-rice-report.pdf';
    File::ensureDirectoryExists(dirname(public_path($relativePath)));
    File::put(public_path($relativePath), '%PDF-1.4 test report content');

    Product::create([
        'name' => 'Premium Basmati Rice',
        'slug' => 'premium-basmati-rice',
        'sku' => 'RICE-BAS-01',
        'status' => 'approved',
        'lab_report_path' => $relativePath,
    ]);

    $response = $this->get('/api/products/premium-basmati-rice/lab-report');

    $response->assertOk()
        ->assertDownload('premium-basmati-rice-report.pdf');
});

it('returns 404 when the product has no lab report', function () {
    Product::create([
        'name' => 'Premium Basmati Rice',
        'slug' => 'premium-basmati-rice',
        'sku' => 'RICE-BAS-01',
        'status' => 'approved',
        'lab_report_path' => null,
    ]);

    $this->getJson('/api/products/premium-basmati-rice/lab-report')
        ->assertNotFound();
});

it('returns 404 when the product is not approved', function () {
    $relativePath = 'downloads/reports/draft-report.pdf';
    File::ensureDirectoryExists(dirname(public_path($relativePath)));
    File::put(public_path($relativePath), '%PDF-1.4 draft');

    Product::create([
        'name' => 'Draft Product',
        'slug' => 'draft-product',
        'sku' => 'DRAFT-01',
        'status' => 'pending',
        'lab_report_path' => $relativePath,
    ]);

    $this->getJson('/api/products/draft-product/lab-report')
        ->assertNotFound();
});

it('exposes lab_report_path and lab_report_url on the public product payload', function () {
    $relativePath = 'downloads/reports/coa-report.pdf';
    File::ensureDirectoryExists(dirname(public_path($relativePath)));
    File::put(public_path($relativePath), '%PDF-1.4 coa');

    Product::create([
        'name' => 'Premium Basmati Rice',
        'slug' => 'premium-basmati-rice',
        'sku' => 'RICE-BAS-01',
        'status' => 'approved',
        'lab_report_path' => $relativePath,
    ]);

    $this->getJson('/api/products/premium-basmati-rice')
        ->assertOk()
        ->assertJsonPath('data.lab_report_path', $relativePath)
        ->assertJsonPath('data.lab_report_url', url($relativePath));
});

it('stores product report uploads under public downloads reports', function () {
    $this->seed(RoleSeeder::class);
    $admin = User::factory()->create(['account_status' => 'active']);
    $admin->assignRole('admin');

    $file = Illuminate\Http\UploadedFile::fake()->create('lab-coa.pdf', 120, 'application/pdf');

    $response = $this->actingAs($admin)
        ->post('/api/uploads', [
            'file' => $file,
            'category' => 'product-reports',
        ], [
            'Accept' => 'application/json',
        ]);

    $response->assertCreated();
    $path = $response->json('data.path');

    expect($path)->toStartWith('downloads/reports/')
        ->and(File::exists(public_path($path)))->toBeTrue();
});

it('maps product_lab_reports folder to downloads reports', function () {
    $this->seed(RoleSeeder::class);
    $admin = User::factory()->create(['account_status' => 'active']);
    $admin->assignRole('admin');

    $file = Illuminate\Http\UploadedFile::fake()->create('report.docx', 80, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    $response = $this->actingAs($admin)
        ->post('/api/uploads', [
            'file' => $file,
            'folder' => 'product_lab_reports',
        ], [
            'Accept' => 'application/json',
        ]);

    $response->assertCreated();
    expect($response->json('data.path'))->toStartWith('downloads/reports/');
});
