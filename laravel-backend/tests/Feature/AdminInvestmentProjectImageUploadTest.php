<?php

use App\Models\InvestmentProject;
use App\Models\User;
use App\Support\MediaStorage;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->admin = User::factory()->create(['account_status' => 'active']);
    $this->admin->assignRole('admin');
});

afterEach(function () {
    $uploadRoot = public_path('upload');
    if (File::isDirectory($uploadRoot)) {
        File::deleteDirectory($uploadRoot);
    }
});

it('uploads an investment project cover image for admins', function () {
    $file = UploadedFile::fake()->image('cover.jpg', 640, 480);

    $response = $this->actingAs($this->admin)
        ->post('/api/admin/investment-projects/images', [
            'title' => 'Basmati Container',
            'image' => $file,
        ], [
            'Accept' => 'application/json',
        ]);

    $response->assertCreated()
        ->assertJsonPath('message', 'Image uploaded.')
        ->assertJsonStructure(['data' => ['path', 'url']]);

    $path = $response->json('data.path');
    expect($path)->toStartWith('upload/investmentproject/')
        ->and(File::exists(public_path($path)))->toBeTrue();
});

it('rejects non-image uploads for investment covers', function () {
    $file = UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf');

    $this->actingAs($this->admin)
        ->post('/api/admin/investment-projects/images', [
            'title' => 'Bad File',
            'image' => $file,
        ], [
            'Accept' => 'application/json',
        ])
        ->assertStatus(422);
});

it('persists normalized image_url when updating a project', function () {
    $project = InvestmentProject::query()->create([
        'title' => 'Basmati Export',
        'type' => 'container',
        'status' => 'funding',
        'target_amount' => 500000,
        'raised_amount' => 0,
        'investors_count' => 0,
        'image_url' => 'https://ogexports.co/assets/old-cover.png',
    ]);

    $newPath = 'upload/investmentproject/'.$project->id.'/cover.jpg';
    File::ensureDirectoryExists(public_path('upload/investmentproject/'.$project->id));
    File::put(public_path($newPath), 'image-bytes');

    $absoluteUrl = url($newPath);

    $this->actingAs($this->admin)
        ->putJson("/api/admin/investment-projects/{$project->id}", [
            'image_url' => $absoluteUrl,
        ])
        ->assertOk()
        ->assertJsonPath('data.image_url', MediaStorage::url($newPath));

    expect($project->fresh()->image_url)->toBe($newPath);
});

it('auto-persists cover image when uploading with project_id', function () {
    $project = InvestmentProject::query()->create([
        'title' => 'Feed Mill Unit',
        'type' => 'feed',
        'status' => 'funding',
        'target_amount' => 250000,
        'raised_amount' => 0,
        'investors_count' => 0,
    ]);

    $file = UploadedFile::fake()->image('cover.jpg', 640, 480);

    $response = $this->actingAs($this->admin)
        ->post('/api/admin/investment-projects/images', [
            'title' => $project->title,
            'project_id' => $project->id,
            'image' => $file,
        ], [
            'Accept' => 'application/json',
        ]);

    $response->assertCreated();

    $path = $response->json('data.path');

    expect($path)->toStartWith('upload/investmentproject/'.$project->id.'/')
        ->and($project->fresh()->image_url)->toBe($path);
});
