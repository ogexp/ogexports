<?php

use App\Models\EmailTemplate;
use App\Models\User;
use Closure as GlobalClosure;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Mockery as GlobalMockery;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->investor = User::factory()->create([
        'name' => 'Withdrawal OTP Investor',
        'email' => 'mira@example.com',
        'account_status' => 'active',
        'email_verified_at' => now(),
    ]);
    $this->investor->assignRole('investor');
    $this->token = $this->investor->createToken('withdrawal_otp_test')->plainTextToken;
});

it('sends the withdrawal otp using the configured email template', function () {
    EmailTemplate::query()->create([
        'slug' => 'withdraw_otp',
        'subject' => '{{app_name}} — Withdrawal Verification Code',
        'body_html' => '<p>Code: {{otp_code}}</p>',
        'body_text' => 'Code: {{otp_code}}',
        'placeholders' => ['otp_code'],
        'is_active' => true,
    ]);

    Mail::shouldReceive('send')
        ->once()
        ->with([], [], GlobalMockery::type(GlobalClosure::class))
        ->andReturnNull();

    $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson('/api/investor/withdrawals/otp/send')
        ->assertOk()
        ->assertJsonPath('message', 'Verification code sent to your email.')
        ->assertJsonPath('data.email', 'mi**@example.com');

    expect($this->investor->fresh()->withdraw_otp_code)->not->toBeNull()
        ->and($this->investor->fresh()->withdraw_otp_expires_at)->not->toBeNull();
});

it('falls back to a raw email when template delivery fails', function () {
    EmailTemplate::query()->create([
        'slug' => 'withdraw_otp',
        'subject' => '{{app_name}} — Withdrawal Verification Code',
        'body_html' => '<p>Code: {{otp_code}}</p>',
        'body_text' => 'Code: {{otp_code}}',
        'placeholders' => ['otp_code'],
        'is_active' => true,
    ]);

    Mail::shouldReceive('send')
        ->once()
        ->andThrow(new RuntimeException('Template delivery failed.'));
    Mail::shouldReceive('raw')
        ->once()
        ->withArgs(fn ($body, $callback) => str_contains($body, 'Your withdrawal verification code is:')
            && str_contains($body, '10 minutes')
            && $callback instanceof GlobalClosure)
        ->andReturnNull();

    $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson('/api/investor/withdrawals/otp/send')
        ->assertOk()
        ->assertJsonPath('message', 'Verification code sent to your email.')
        ->assertJsonPath('data.email', 'mi**@example.com');

    expect($this->investor->fresh()->withdraw_otp_code)->not->toBeNull()
        ->and($this->investor->fresh()->withdraw_otp_expires_at)->not->toBeNull();
});

it('returns an error and clears the otp when template and fallback delivery both fail', function () {
    EmailTemplate::query()->create([
        'slug' => 'withdraw_otp',
        'subject' => '{{app_name}} — Withdrawal Verification Code',
        'body_html' => '<p>Code: {{otp_code}}</p>',
        'body_text' => 'Code: {{otp_code}}',
        'placeholders' => ['otp_code'],
        'is_active' => true,
    ]);

    Mail::shouldReceive('send')
        ->once()
        ->andThrow(new RuntimeException('Template delivery failed.'));
    Mail::shouldReceive('raw')
        ->once()
        ->andThrow(new RuntimeException('Fallback delivery failed.'));

    $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson('/api/investor/withdrawals/otp/send')
        ->assertStatus(503)
        ->assertJsonPath('message', 'We could not send your withdrawal verification code. Please try again later.');

    expect($this->investor->fresh()->withdraw_otp_code)->toBeNull()
        ->and($this->investor->fresh()->withdraw_otp_expires_at)->toBeNull();
});
