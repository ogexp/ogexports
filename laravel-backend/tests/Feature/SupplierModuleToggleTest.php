<?php

use App\Models\PlatformSetting;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    PlatformSetting::query()->create([
        'site_name' => 'OG Exports',
        'registration_open' => true,
        'investment_open' => true,
        'supplier_module_enabled' => true,
        'investment_module_enabled' => true,
        'currency' => 'USD',
    ]);
});

it('exposes supplier_module_enabled in public settings by default', function () {
    $this->getJson('/api/settings')
        ->assertOk()
        ->assertJsonPath('data.supplier_module_enabled', true);
});

it('allows supplier registration when module is enabled', function () {
    $this->postJson('/api/auth/register', [
        'name' => 'Test Supplier',
        'email' => 'supplier-on@example.com',
        'password' => 'Password@123',
        'password_confirmation' => 'Password@123',
        'account_type' => 'supplier',
        'country' => 'Pakistan',
    ])->assertCreated()
        ->assertJsonPath('redirect', '/supplier/dashboard')
        ->assertJsonPath('user.accountType', 'supplier');
});

it('blocks supplier registration when module is disabled', function () {
    PlatformSetting::query()->first()->update(['supplier_module_enabled' => false]);

    $this->postJson('/api/auth/register', [
        'name' => 'Blocked Supplier',
        'email' => 'supplier-off@example.com',
        'password' => 'Password@123',
        'password_confirmation' => 'Password@123',
        'account_type' => 'supplier',
        'country' => 'Pakistan',
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['account_type']);
});

it('blocks supplier login when module is disabled', function () {
    $supplier = User::factory()->create([
        'email' => 'existing-supplier@example.com',
        'password' => 'Password@123',
        'account_status' => 'active',
    ]);
    $supplier->assignRole('supplier');

    PlatformSetting::query()->first()->update(['supplier_module_enabled' => false]);

    $this->postJson('/api/auth/login', [
        'email' => 'existing-supplier@example.com',
        'password' => 'Password@123',
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['email']);
});

it('blocks supplier api routes when module is disabled', function () {
    $supplier = User::factory()->create([
        'email' => 'api-supplier@example.com',
        'password' => 'Password@123',
        'account_status' => 'active',
    ]);
    $supplier->assignRole('supplier');

    PlatformSetting::query()->first()->update(['supplier_module_enabled' => false]);

    $this->actingAs($supplier)
        ->getJson('/api/supplier/dashboard')
        ->assertForbidden()
        ->assertJsonPath('message', 'The Supplier module is currently unavailable.');
});

it('blocks admin supplier offer apis when module is disabled but keeps platform settings writable', function () {
    $admin = User::factory()->create([
        'email' => 'admin-toggle@example.com',
        'password' => 'Password@123',
        'account_status' => 'active',
    ]);
    $admin->assignRole('admin');

    PlatformSetting::query()->first()->update(['supplier_module_enabled' => false]);

    $this->actingAs($admin)
        ->getJson('/api/admin/supplier-offers')
        ->assertForbidden();

    $this->actingAs($admin)
        ->putJson('/api/admin/cms/platform-settings', [
            'supplier_module_enabled' => true,
        ])
        ->assertOk()
        ->assertJsonPath('data.supplier_module_enabled', true);

    expect(PlatformSetting::query()->first()->supplier_module_enabled)->toBeTrue();
});

it('blocks impersonating a supplier when module is disabled', function () {
    $admin = User::factory()->create([
        'email' => 'admin-impersonate@example.com',
        'password' => 'Password@123',
        'account_status' => 'active',
    ]);
    $admin->assignRole('admin');

    $supplier = User::factory()->create([
        'email' => 'impersonate-supplier@example.com',
        'password' => 'Password@123',
        'account_status' => 'active',
    ]);
    $supplier->assignRole('supplier');

    PlatformSetting::query()->first()->update(['supplier_module_enabled' => false]);

    $this->actingAs($admin)
        ->postJson("/api/admin/users/{$supplier->id}/impersonate")
        ->assertForbidden();
});
