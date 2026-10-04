<?php

use App\Models\KycApplication;
use App\Models\User;
use App\Models\UserProfile;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->buyer = User::factory()->create([
        'name' => 'Buyer Test',
        'account_status' => 'active',
    ]);
    $this->buyer->assignRole('buyer');
    UserProfile::query()->create([
        'user_id' => $this->buyer->id,
        'company_name' => 'Buyer Co',
        'country' => 'Pakistan',
    ]);
});

it('returns approved kyc_status when company application is approved', function () {
    KycApplication::query()->create([
        'user_id' => $this->buyer->id,
        'type' => 'company',
        'status' => 'approved',
        'submitted_at' => now()->subDay(),
        'reviewed_at' => now(),
    ]);

    $this->actingAs($this->buyer)
        ->withHeader('Origin', 'http://localhost:5000')
        ->getJson('/api/buyer/dashboard')
        ->assertOk()
        ->assertJsonPath('data.kyc_status', 'approved')
        ->assertJsonPath('data.kyc_approved', true);
});

it('returns approved kyc_status from profile meta even when a newer company application is pending', function () {
    KycApplication::query()->create([
        'user_id' => $this->buyer->id,
        'type' => 'company',
        'status' => 'approved',
        'submitted_at' => now()->subDays(2),
        'reviewed_at' => now()->subDay(),
    ]);

    KycApplication::query()->create([
        'user_id' => $this->buyer->id,
        'type' => 'company',
        'status' => 'pending',
        'submitted_at' => now(),
    ]);

    $this->buyer->profile->update([
        'meta' => [
            'kyc' => true,
            'kyc_complete' => true,
        ],
    ]);

    $this->actingAs($this->buyer->fresh())
        ->withHeader('Origin', 'http://localhost:5000')
        ->getJson('/api/buyer/dashboard')
        ->assertOk()
        ->assertJsonPath('data.kyc_status', 'approved')
        ->assertJsonPath('data.kyc_approved', true);
});

it('returns missing kyc_status when buyer has no application or meta', function () {
    $this->actingAs($this->buyer)
        ->withHeader('Origin', 'http://localhost:5000')
        ->getJson('/api/buyer/dashboard')
        ->assertOk()
        ->assertJsonPath('data.kyc_status', 'missing')
        ->assertJsonPath('data.kyc_approved', false);
});

it('marks company registration done on profile checklist when approved kyc has registration document', function () {
    $this->buyer->profile->update(['company_name' => null]);

    $kyc = KycApplication::query()->create([
        'user_id' => $this->buyer->id,
        'type' => 'company',
        'status' => 'approved',
        'submitted_at' => now()->subDay(),
        'reviewed_at' => now(),
    ]);

    foreach ([
        'company_registration',
        'import_license',
        'tax_registration',
        'kyc_documents',
        'banking_details',
    ] as $docType) {
        \App\Models\KycDocument::query()->create([
            'kyc_application_id' => $kyc->id,
            'doc_type' => $docType,
            'path' => "kyc/{$docType}.pdf",
            'original_name' => "{$docType}.pdf",
        ]);
    }

    $this->buyer->profile->update([
        'meta' => [
            'kyc' => true,
            'kyc_complete' => true,
            'import_license' => true,
            'tax_registration' => true,
            'banking_details' => true,
        ],
    ]);

    $response = $this->actingAs($this->buyer->fresh())
        ->withHeader('Origin', 'http://localhost:5000')
        ->getJson('/api/buyer/dashboard')
        ->assertOk()
        ->assertJsonPath('data.kyc_status', 'approved')
        ->assertJsonPath('data.profile_completion', 100);

    $checklist = $response->json('data.profile_checklist');
    expect($checklist)->toBeArray();

    $byLabel = collect($checklist)->keyBy('label');
    expect($byLabel->get('Company Registration')['done'] ?? false)->toBeTrue()
        ->and($byLabel->get('Import License')['done'] ?? false)->toBeTrue()
        ->and($byLabel->get('Tax Registration')['done'] ?? false)->toBeTrue()
        ->and($byLabel->get('KYC Documents')['done'] ?? false)->toBeTrue()
        ->and($byLabel->get('Banking Details')['done'] ?? false)->toBeTrue();
});
