<?php

use App\Models\Deposit;
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

    $legacyDir = storage_path('app/public/uploads/deposit-proofs');
    if (File::isDirectory($legacyDir)) {
        File::deleteDirectory($legacyDir);
    }
});

it('returns a direct public proof url for admin deposit listings', function () {
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    $proofPath = 'upload/deposits/1/proof.jpg';
    File::ensureDirectoryExists(public_path('upload/deposits/1'));
    File::put(public_path($proofPath), 'proof');

    $deposit = Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 100,
        'currency' => 'USD',
        'method' => 'bank_transfer',
        'reference' => 'DEP-TEST-1',
        'status' => 'pending',
        'proof_path' => $proofPath,
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/finance/deposits');

    $response->assertOk();

    $row = collect($response->json('data'))->firstWhere('id', $deposit->id);

    expect($row['proof_url'])->toBe(MediaStorage::url($proofPath))
        ->and($row['proof_url'])->toContain('/upload/deposits/1/proof.jpg')
        ->and($row['proof_url'])->not->toContain('/api/admin/finance/deposits/');
});

it('resolves legacy storage proof urls for admin deposit listings', function () {
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    File::ensureDirectoryExists(storage_path('app/public/uploads/deposit-proofs'));
    File::put(storage_path('app/public/uploads/deposit-proofs/legacy.jpg'), 'legacy-proof');
    $proofPath = 'uploads/deposit-proofs/legacy.jpg';

    $deposit = Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 250,
        'currency' => 'USD',
        'method' => 'bank_transfer',
        'reference' => 'DEP-TEST-2',
        'status' => 'pending',
        'proof_path' => $proofPath,
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/finance/deposits');

    $response->assertOk();

    $row = collect($response->json('data'))->firstWhere('id', $deposit->id);

    expect($row['proof_url'])->toContain('/storage/uploads/deposit-proofs/legacy.jpg');
});

it('serves deposit proof from the authenticated fallback endpoint', function () {
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    $proofPath = 'upload/deposits/3/proof.jpg';
    File::ensureDirectoryExists(public_path('upload/deposits/3'));
    File::put(public_path($proofPath), 'proof');

    $deposit = Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 50,
        'currency' => 'USD',
        'method' => 'bank_transfer',
        'reference' => 'DEP-TEST-3',
        'status' => 'pending',
        'proof_path' => $proofPath,
    ]);

    $this->actingAs($this->admin)
        ->get('/api/admin/finance/deposits/'.$deposit->id.'/proof')
        ->assertOk();
});

it('serves legacy deposit-proofs files from the authenticated proof endpoint', function () {
    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    File::ensureDirectoryExists(storage_path('app/public/uploads/deposit-proofs'));
    File::put(storage_path('app/public/uploads/deposit-proofs/legacy.jpg'), 'legacy-proof');
    $proofPath = 'uploads/deposit-proofs/legacy.jpg';

    $deposit = Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 75,
        'currency' => 'USD',
        'method' => 'bank_transfer',
        'reference' => 'DEP-TEST-4',
        'status' => 'pending',
        'proof_path' => $proofPath,
    ]);

    $this->actingAs($this->admin)
        ->get('/api/admin/finance/deposits/'.$deposit->id.'/proof')
        ->assertOk();
});

it('serves legacy storage files via web fallback route', function () {
    File::ensureDirectoryExists(storage_path('app/public/uploads/deposit-proofs'));
    File::put(storage_path('app/public/uploads/deposit-proofs/test.png'), 'png-data');

    $this->get('/storage/uploads/deposit-proofs/test.png')
        ->assertOk();
});
