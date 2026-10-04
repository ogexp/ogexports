<?php

use App\Models\PlatformSetting;
use App\Models\User;
use App\Services\AuthOtpService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

it('logs in admin without otp when admin_otp_enabled is false', function () {
    PlatformSetting::query()->create([
        'site_name' => 'OG Exports',
        'admin_otp_enabled' => false,
    ]);

    $admin = User::factory()->create([
        'email' => 'admin-otp-off@ogexports.com',
        'password' => 'Password@123',
        'account_status' => 'active',
        'two_factor_enabled' => true,
    ]);
    $admin->assignRole('admin');

    $this->postJson('/api/auth/login', [
        'email' => 'admin-otp-off@ogexports.com',
        'password' => 'Password@123',
    ])
        ->assertOk()
        ->assertJsonMissing(['requires_2fa' => true])
        ->assertJsonPath('redirect', '/admin/dashboard');

    $this->assertAuthenticated();
});

it('requires otp for admin login when admin_otp_enabled is true', function () {
    PlatformSetting::query()->create([
        'site_name' => 'OG Exports',
        'admin_otp_enabled' => true,
    ]);

    $admin = User::factory()->create([
        'email' => 'admin-otp-on@ogexports.com',
        'password' => 'Password@123',
        'account_status' => 'active',
        'two_factor_enabled' => false,
    ]);
    $admin->assignRole('admin');

    $login = $this->postJson('/api/auth/login', [
        'email' => 'admin-otp-on@ogexports.com',
        'password' => 'Password@123',
    ])
        ->assertOk()
        ->assertJsonPath('requires_2fa', true);

    $this->assertGuest();

    $token = $login->json('token');
    expect($token)->not->toBeEmpty();

    $code = $login->json('dev_otp') ?: AuthOtpService::DEV_OTP_CODE;

    $this->postJson('/api/auth/2fa/verify', [
        'token' => $token,
        'code' => $code,
    ])
        ->assertOk()
        ->assertJsonPath('redirect', '/admin/dashboard');

    $this->assertAuthenticated();
});

it('still challenges investor with personal 2fa when admin otp is off', function () {
    PlatformSetting::query()->create([
        'site_name' => 'OG Exports',
        'admin_otp_enabled' => false,
        'investment_module_enabled' => true,
    ]);

    $investor = User::factory()->create([
        'email' => 'investor-2fa@ogexports.com',
        'password' => 'Password@123',
        'account_status' => 'active',
        'two_factor_enabled' => true,
    ]);
    $investor->assignRole('investor');

    $this->postJson('/api/auth/login', [
        'email' => 'investor-2fa@ogexports.com',
        'password' => 'Password@123',
    ])
        ->assertOk()
        ->assertJsonPath('requires_2fa', true);

    $this->assertGuest();
});

it('allows authenticated admin to change password', function () {
    $admin = User::factory()->create([
        'email' => 'admin-pw@ogexports.com',
        'password' => 'Password@123',
        'account_status' => 'active',
    ]);
    $admin->assignRole('admin');

    $this->withHeader('Origin', 'http://localhost:5000')
        ->postJson('/api/auth/login', [
            'email' => 'admin-pw@ogexports.com',
            'password' => 'Password@123',
        ])
        ->assertOk();

    $this->withHeader('Origin', 'http://localhost:5000')
        ->putJson('/api/me/password', [
            'current_password' => 'Password@123',
            'password' => 'NewPassword@456',
            'password_confirmation' => 'NewPassword@456',
        ])
        ->assertOk()
        ->assertJsonPath('message', 'Password updated successfully.');

    expect(Hash::check('NewPassword@456', $admin->fresh()->password))->toBeTrue();
});
