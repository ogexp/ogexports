<?php

use App\Models\KycApplication;
use App\Models\User;
use App\Models\UserProfile;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->supplier = User::factory()->create([
        'name' => 'Supplier Test',
        'account_status' => 'active',
    ]);
    $this->supplier->assignRole('supplier');
    UserProfile::query()->create([
        'user_id' => $this->supplier->id,
        'company_name' => 'Supplier Co',
        'country' => 'Pakistan',
    ]);
});

it('returns approved kyc_status when supplier application is approved', function () {
    KycApplication::query()->create([
        'user_id' => $this->supplier->id,
        'type' => 'supplier',
        'status' => 'approved',
        'submitted_at' => now()->subDay(),
        'reviewed_at' => now(),
    ]);

    $this->actingAs($this->supplier)
        ->withHeader('Origin', 'http://localhost:5000')
        ->getJson('/api/supplier/dashboard')
        ->assertOk()
        ->assertJsonPath('data.kyc_status', 'approved')
        ->assertJsonPath('data.kyc_approved', true)
        ->assertJsonPath('data.supplier.kyc_status', 'approved')
        ->assertJsonPath('data.supplier.kyc_approved', true);
});

it('returns approved kyc_status from profile meta even when a newer supplier application is pending', function () {
    KycApplication::query()->create([
        'user_id' => $this->supplier->id,
        'type' => 'supplier',
        'status' => 'approved',
        'submitted_at' => now()->subDays(2),
        'reviewed_at' => now()->subDay(),
    ]);

    KycApplication::query()->create([
        'user_id' => $this->supplier->id,
        'type' => 'supplier',
        'status' => 'pending',
        'submitted_at' => now(),
    ]);

    $this->supplier->profile->update([
        'meta' => [
            'kyc' => true,
            'kyc_complete' => true,
        ],
    ]);

    $this->actingAs($this->supplier->fresh())
        ->withHeader('Origin', 'http://localhost:5000')
        ->getJson('/api/supplier/dashboard')
        ->assertOk()
        ->assertJsonPath('data.kyc_status', 'approved')
        ->assertJsonPath('data.kyc_approved', true)
        ->assertJsonPath('data.supplier.kyc_status', 'approved');
});

it('returns missing kyc_status when supplier has no application or meta', function () {
    $this->actingAs($this->supplier)
        ->withHeader('Origin', 'http://localhost:5000')
        ->getJson('/api/supplier/dashboard')
        ->assertOk()
        ->assertJsonPath('data.kyc_status', 'missing')
        ->assertJsonPath('data.kyc_approved', false)
        ->assertJsonPath('data.supplier.kyc_status', 'missing')
        ->assertJsonPath('data.supplier.kyc_approved', false);
});
