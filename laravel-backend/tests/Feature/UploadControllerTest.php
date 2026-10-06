<?php

use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->user = User::factory()->create(['account_status' => 'active']);
    $this->user->assignRole('buyer');
});

afterEach(function () {
    foreach (['upload', 'downloads'] as $root) {
        $path = public_path($root);
        if (File::isDirectory($path)) {
            File::deleteDirectory($path);
        }
    }

    File::ensureDirectoryExists(public_path('downloads/reports'));
    File::put(public_path('downloads/reports/.gitkeep'), '');
});

it('uploads kyc images up to 10mb to the public upload directory', function () {
    $file = UploadedFile::fake()->image('id.jpg')->size(10 * 1024);

    $response = $this->actingAs($this->user)
        ->post('/api/uploads', [
            'file' => $file,
            'folder' => 'kyc',
        ], [
            'Accept' => 'application/json',
        ]);

    $response->assertCreated()
        ->assertJsonStructure(['data' => ['path', 'url', 'name', 'mime', 'size']]);

    $path = $response->json('data.path');
    expect($path)->toStartWith('upload/kyc/'.$this->user->id.'/')
        ->and(File::exists(public_path($path)))->toBeTrue();
});

it('rejects kyc images larger than 10mb', function () {
    $file = UploadedFile::fake()->image('large.jpg')->size(11 * 1024);

    $this->actingAs($this->user)
        ->post('/api/uploads', [
            'file' => $file,
            'category' => 'kyc',
        ], [
            'Accept' => 'application/json',
        ])
        ->assertStatus(422);
});

it('keeps the 8mb image limit for non-kyc uploads', function () {
    $file = UploadedFile::fake()->image('large.jpg')->size(9 * 1024);

    $this->actingAs($this->user)
        ->post('/api/uploads', [
            'file' => $file,
            'folder' => 'general',
        ], [
            'Accept' => 'application/json',
        ])
        ->assertStatus(422);
});

it('maps legacy folder param to upload categories', function () {
    $file = UploadedFile::fake()->image('proof.jpg');

    $response = $this->actingAs($this->user)
        ->post('/api/uploads', [
            'file' => $file,
            'folder' => 'deposits',
        ], [
            'Accept' => 'application/json',
        ]);

    $response->assertCreated();

    expect($response->json('data.path'))->toStartWith('upload/deposits/'.$this->user->id.'/');
});

it('maps product report folder to public downloads reports', function () {
    $file = UploadedFile::fake()->create('coa.pdf', 100, 'application/pdf');

    $response = $this->actingAs($this->user)
        ->post('/api/uploads', [
            'file' => $file,
            'folder' => 'product_lab_reports',
        ], [
            'Accept' => 'application/json',
        ]);

    $response->assertCreated();

    $path = $response->json('data.path');
    expect($path)->toStartWith('downloads/reports/')
        ->and(File::exists(public_path($path)))->toBeTrue();
});
