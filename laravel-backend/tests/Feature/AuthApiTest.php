<?php

use App\Models\User;
use App\Models\PlatformSetting;
use App\Models\Wallet;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

it('returns health status', function () {
    $this->getJson('/api/health')
        ->assertOk()
        ->assertJsonPath('status', 'ok');
});

it('lists approved products publicly', function () {
    $this->getJson('/api/products')
        ->assertOk();
});

it('allows credentialed product requests from the local frontend', function () {
    $origin = 'http://localhost:5003';

    $this->withHeaders([
        'Origin' => $origin,
        'Access-Control-Request-Method' => 'GET',
        'Access-Control-Request-Headers' => 'content-type,x-xsrf-token',
    ])->options('/api/products')
        ->assertNoContent()
        ->assertHeader('Access-Control-Allow-Origin', $origin)
        ->assertHeader('Access-Control-Allow-Credentials', 'true');

    $this->withHeader('Origin', $origin)
        ->getJson('/api/products')
        ->assertOk()
        ->assertHeader('Access-Control-Allow-Origin', $origin)
        ->assertHeader('Access-Control-Allow-Credentials', 'true');
});

it('registers a buyer and requires email verification', function () {
    $response = $this->withHeader('Origin', 'http://localhost:5000')
        ->postJson('/api/auth/register', [
            'name' => 'Test Buyer',
            'email' => 'newbuyer@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'account_type' => 'buyer',
            'country' => 'Pakistan',
        ]);

    $response->assertCreated()
        ->assertJsonPath('requires_verification', true)
        ->assertJsonPath('email', 'newbuyer@example.com');

    $this->assertGuest();
    $buyer = User::where('email', 'newbuyer@example.com')->first();
    expect($buyer->hasRole('buyer'))->toBeTrue();
    expect($buyer->profile?->country)->toBe('Pakistan');
});

it('registers Pakistan-based investors with USD as the initial Profile and wallet currency', function () {
    PlatformSetting::query()->create([
        'site_name' => 'OG Exports',
        'registration_open' => true,
        'investment_open' => true,
        'supplier_module_enabled' => true,
        'investment_module_enabled' => true,
        'currency' => 'USD',
    ]);

    $this->postJson('/api/auth/register', [
        'name' => 'New Investor',
        'email' => 'new-investor-currency@example.com',
        'password' => 'Password@123',
        'password_confirmation' => 'Password@123',
        'account_type' => 'investor',
        'country' => 'Pakistan',
    ])->assertCreated()
        ->assertJsonPath('requires_verification', true)
        ->assertJsonPath('email', 'new-investor-currency@example.com');

    $investor = User::query()->where('email', 'new-investor-currency@example.com')->firstOrFail();
    $preferences = $investor->profile?->meta['preferences'] ?? [];
    $wallet = Wallet::query()->where('user_id', $investor->id)->firstOrFail();

    expect($preferences['currency'] ?? null)->toBe('USD')
        ->and($wallet->currency)->toBe('USD');
});

it('logs in admin and can access admin dashboard', function () {
    $admin = User::factory()->create([
        'email' => 'admin-test@ogexports.com',
        'password' => 'Password@123',
        'account_status' => 'active',
    ]);
    $admin->assignRole('admin');

    $this->withHeader('Origin', 'http://localhost:5000')
        ->postJson('/api/auth/login', [
            'email' => 'admin-test@ogexports.com',
            'password' => 'Password@123',
        ])->assertOk()->assertJsonPath('redirect', '/admin/dashboard');

    $this->actingAs($admin)->getJson('/api/admin/dashboard')->assertOk();
});

it('blocks buyer from admin routes', function () {
    $buyer = User::factory()->create([
        'email' => 'buyer-test@ogexports.com',
        'password' => 'Password@123',
        'account_status' => 'active',
    ]);
    $buyer->assignRole('buyer');

    $this->actingAs($buyer)
        ->getJson('/api/admin/dashboard')
        ->assertStatus(403);
});

it('accepts contact messages', function () {
    $this->postJson('/api/contact', [
        'name' => 'Visitor',
        'email' => 'visitor@example.com',
        'subject' => 'Hello',
        'message' => 'Looking for basmati rice quote.',
    ])->assertSuccessful();
});
