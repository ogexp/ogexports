<?php

use App\Models\InvestmentProject;
use App\Models\InvestmentProjectDocument;
use App\Models\KycApplication;
use App\Models\KycDocument;
use App\Models\User;
use App\Support\MediaStorage;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

it('returns public kyc document urls for admin kyc show', function () {
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    $proofPath = 'upload/kyc/1/passport.jpg';
    File::ensureDirectoryExists(public_path('upload/kyc/1'));
    File::put(public_path($proofPath), 'kyc-doc');

    $kyc = KycApplication::query()->create([
        'user_id' => $investor->id,
        'type' => 'individual',
        'country' => 'Pakistan',
        'status' => 'review',
        'submitted_at' => now(),
    ]);

    $document = KycDocument::query()->create([
        'kyc_application_id' => $kyc->id,
        'doc_type' => 'passport',
        'path' => $proofPath,
        'original_name' => 'passport.jpg',
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/compliance/kyc/'.$kyc->id);

    $response->assertOk();

    $row = collect($response->json('data.documents'))->firstWhere('id', $document->id);

    expect($row['url'])->toBe(MediaStorage::url($proofPath))
        ->and($row['view_url'])->toBe(MediaStorage::url($proofPath))
        ->and($row['download_url'])->toBe(MediaStorage::url($proofPath))
        ->and($row['view_url'])->toContain('/upload/kyc/1/passport.jpg')
        ->and($row['view_url'])->not->toContain('/api/admin/compliance/kyc/');
});

it('serves upload files via web fallback route without auth', function () {
    File::ensureDirectoryExists(public_path('upload/kyc/1'));
    File::put(public_path('upload/kyc/1/doc.jpg'), 'public-kyc');

    $this->get('/upload/kyc/1/doc.jpg')
        ->assertOk();
});

it('returns public url for investment project documents', function () {
    $project = InvestmentProject::query()->create([
        'title' => 'Test Project',
        'type' => 'container',
        'status' => 'funding',
        'target_amount' => 100000,
        'raised_amount' => 0,
        'investors_count' => 0,
    ]);

    $docPath = 'upload/investmentproject/'.$project->id.'/agreement.pdf';
    File::ensureDirectoryExists(public_path('upload/investmentproject/'.$project->id));
    File::put(public_path($docPath), 'pdf-content');

    $document = InvestmentProjectDocument::query()->create([
        'investment_project_id' => $project->id,
        'title' => 'Investment Agreement',
        'path' => $docPath,
        'original_name' => 'agreement.pdf',
        'size_bytes' => 11,
        'mime' => 'application/pdf',
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/investment-projects/'.$project->id.'/documents');

    $response->assertOk();

    $row = collect($response->json('data'))->firstWhere('id', $document->id);

    expect($row['url'])->toBe(MediaStorage::url($docPath))
        ->and($row['download_url'])->toBe(MediaStorage::url($docPath))
        ->and($row['url'])->toContain('/upload/investmentproject/'.$project->id.'/agreement.pdf')
        ->and($row['url'])->not->toContain('/api/admin/investment-projects/');
});
