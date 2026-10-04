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

it('exposes investment_module_enabled in public settings by default', function () {
    $this->getJson('/api/settings')
        ->assertOk()
        ->assertJsonPath('data.investment_module_enabled', true);
});

it('allows investor registration when module is enabled', function () {
    $this->postJson('/api/auth/register', [
        'name' => 'Test Investor',
        'email' => 'investor-on@example.com',
        'password' => 'Password@123',
        'password_confirmation' => 'Password@123',
        'account_type' => 'investor',
        'country' => 'Pakistan',
    ])->assertCreated()
        ->assertJsonPath('redirect', '/invest/dashboard')
        ->assertJsonPath('user.accountType', 'investor');
});

it('blocks investor registration when module is disabled', function () {
    PlatformSetting::query()->first()->update(['investment_module_enabled' => false]);

    $this->postJson('/api/auth/register', [
        'name' => 'Blocked Investor',
        'email' => 'investor-off@example.com',
        'password' => 'Password@123',
        'password_confirmation' => 'Password@123',
        'account_type' => 'investor',
        'country' => 'Pakistan',
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['account_type']);
});

it('blocks investor login when module is disabled', function () {
    $investor = User::factory()->create([
        'email' => 'existing-investor@example.com',
        'password' => 'Password@123',
        'account_status' => 'active',
    ]);
    $investor->assignRole('investor');

    PlatformSetting::query()->first()->update(['investment_module_enabled' => false]);

    $this->postJson('/api/auth/login', [
        'email' => 'existing-investor@example.com',
        'password' => 'Password@123',
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['email']);
});

it('blocks investor api routes when module is disabled', function () {
    $investor = User::factory()->create([
        'email' => 'api-investor@example.com',
        'password' => 'Password@123',
        'account_status' => 'active',
    ]);
    $investor->assignRole('investor');

    PlatformSetting::query()->first()->update(['investment_module_enabled' => false]);

    $this->actingAs($investor)
        ->getJson('/api/investor/dashboard')
        ->assertForbidden()
        ->assertJsonPath('message', 'The Investment module is currently unavailable.');
});

it('blocks admin investment apis when module is disabled but keeps platform settings writable', function () {
    $admin = User::factory()->create([
        'email' => 'admin-invest-toggle@example.com',
        'password' => 'Password@123',
        'account_status' => 'active',
    ]);
    $admin->assignRole('admin');

    PlatformSetting::query()->first()->update(['investment_module_enabled' => false]);

    $this->actingAs($admin)
        ->getJson('/api/admin/investment-projects')
        ->assertForbidden();

    $this->actingAs($admin)
        ->putJson('/api/admin/cms/platform-settings', [
            'investment_module_enabled' => true,
        ])
        ->assertOk()
        ->assertJsonPath('data.investment_module_enabled', true);

    expect(PlatformSetting::query()->first()->investment_module_enabled)->toBeTrue();
});

it('blocks impersonating an investor when module is disabled', function () {
    $admin = User::factory()->create([
        'email' => 'admin-impersonate-investor@example.com',
        'password' => 'Password@123',
        'account_status' => 'active',
    ]);
    $admin->assignRole('admin');

    $investor = User::factory()->create([
        'email' => 'impersonate-investor@example.com',
        'password' => 'Password@123',
        'account_status' => 'active',
    ]);
    $investor->assignRole('investor');

    PlatformSetting::query()->first()->update(['investment_module_enabled' => false]);

    $this->actingAs($admin)
        ->postJson("/api/admin/users/{$investor->id}/impersonate")
        ->assertForbidden();
});

it('blocks public investment listing when module is disabled', function () {
    PlatformSetting::query()->first()->update(['investment_module_enabled' => false]);

    $this->getJson('/api/investments')
        ->assertForbidden()
        ->assertJsonPath('message', 'The Investment module is currently unavailable.');
});
