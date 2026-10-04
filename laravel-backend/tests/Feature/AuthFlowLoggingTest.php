<?php

use App\Models\EmailTemplate;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->authLogs = [];
    Event::listen(MessageLogged::class, function (MessageLogged $event) {
        $this->authLogs[] = $event;
    });
});

function hasAuthLog(array $logged, string $level, string $message, ?callable $contextCheck = null): bool
{
    foreach ($logged as $event) {
        if ($event->level !== $level || $event->message !== $message) {
            continue;
        }

        if ($contextCheck !== null && ! $contextCheck($event->context)) {
            continue;
        }

        return true;
    }

    return false;
}

function anyLogHasOtpCode(array $logged): bool
{
    foreach ($logged as $event) {
        if (array_key_exists('otp_code', $event->context)) {
            return true;
        }
    }

    return false;
}

it('logs warning when registration otp template is missing', function () {
    $this->postJson('/api/auth/register', [
        'name' => 'Test Buyer',
        'email' => 'newbuyer@example.com',
        'password' => 'Password@123',
        'password_confirmation' => 'Password@123',
        'account_type' => 'buyer',
        'country' => 'Pakistan',
    ])->assertCreated();

    $logged = $this->authLogs;

    expect(hasAuthLog($logged, 'info', 'auth.register.started'))->toBeTrue();
    expect(hasAuthLog($logged, 'warning', 'auth.email.template_missing'))->toBeTrue();
    expect(hasAuthLog($logged, 'warning', 'auth.registration.otp_failed'))->toBeTrue();
    expect(hasAuthLog($logged, 'info', 'auth.register.completed', fn (array $context) => ($context['otp_sent'] ?? null) === false))->toBeTrue();
});

it('logs otp recovery code when registration email fails', function () {
    $this->postJson('/api/auth/register', [
        'name' => 'Test Buyer',
        'email' => 'recovery-buyer@example.com',
        'password' => 'Password@123',
        'password_confirmation' => 'Password@123',
        'account_type' => 'buyer',
    ])->assertCreated();

    $logged = $this->authLogs;

    expect(hasAuthLog($logged, 'warning', 'auth.otp.generated_for_recovery', function (array $context) {
        return ($context['purpose'] ?? null) === 'registration'
            && ($context['trigger'] ?? null) === 'register'
            && ($context['email_sent'] ?? null) === false
            && filled($context['otp_code'] ?? null);
    }))->toBeTrue();
});

it('logs otp recovery code on resend when email fails', function () {
    $user = User::factory()->create([
        'email' => 'resend-buyer@example.com',
        'password' => Hash::make('Password@123'),
        'account_status' => 'pending',
        'email_verified_at' => null,
    ]);
    $user->assignRole('buyer');

    // Clear resend cooldown so the first resend is allowed.
    \Illuminate\Support\Facades\Cache::flush();

    $this->postJson('/api/auth/resend-verification', [
        'email' => 'resend-buyer@example.com',
    ])->assertOk();

    $logged = $this->authLogs;

    expect(hasAuthLog($logged, 'warning', 'auth.otp.generated_for_recovery', function (array $context) {
        return ($context['purpose'] ?? null) === 'registration'
            && ($context['trigger'] ?? null) === 'resend'
            && ($context['email_sent'] ?? null) === false
            && filled($context['otp_code'] ?? null);
    }))->toBeTrue();
});

it('logs success when registration otp template exists', function () {
    EmailTemplate::query()->create([
        'slug' => 'registration_otp',
        'subject' => '{{app_name}} — Verify Your Email',
        'body_html' => '<p>Code: {{otp_code}}</p>',
        'body_text' => 'Code: {{otp_code}}',
        'placeholders' => ['otp_code'],
        'is_active' => true,
    ]);

    $this->postJson('/api/auth/register', [
        'name' => 'Test Buyer',
        'email' => 'verified-buyer@example.com',
        'password' => 'Password@123',
        'password_confirmation' => 'Password@123',
        'account_type' => 'buyer',
    ])->assertCreated();

    $logged = $this->authLogs;

    expect(hasAuthLog($logged, 'info', 'auth.email.sent'))->toBeTrue();
    expect(hasAuthLog($logged, 'info', 'auth.registration.otp_sent'))->toBeTrue();
    expect(hasAuthLog($logged, 'info', 'auth.register.completed', fn (array $context) => ($context['otp_sent'] ?? null) === true))->toBeTrue();
    expect(hasAuthLog($logged, 'info', 'auth.otp.generated', fn (array $context) => ($context['email_sent'] ?? null) === true))->toBeTrue();
    expect(anyLogHasOtpCode($logged))->toBeFalse();
});

it('logs failed login attempts', function () {
    $this->postJson('/api/auth/login', [
        'email' => 'missing@example.com',
        'password' => 'WrongPassword@123',
    ])->assertUnprocessable();

    $logged = $this->authLogs;

    expect(hasAuthLog($logged, 'warning', 'auth.login.failed'))->toBeTrue();
});
