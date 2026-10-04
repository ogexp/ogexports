<?php

use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->buyer = User::factory()->create([
        'account_status' => 'active',
        'name' => 'Doc Buyer',
        'email' => 'docbuyer@test.com',
    ]);
    $this->buyer->assignRole('buyer');
});

it('rejects buyer document uploads', function () {
    $path = 'upload/trade-documents/test-invoice.pdf';
    File::ensureDirectoryExists(public_path('upload/trade-documents'));
    File::put(public_path($path), 'fake-pdf-content');

    $this->actingAs($this->buyer)
        ->postJson('/api/buyer/documents', [
            'type' => 'Commercial Invoice',
            'title' => 'Commercial Invoice',
            'path' => $path,
        ])
        ->assertForbidden();
});
