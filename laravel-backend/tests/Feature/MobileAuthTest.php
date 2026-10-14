<?php

use App\Models\User;
use App\Models\UserProfile;
use App\Models\Wallet;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->investor = User::factory()->create([
        'name' => 'Mobile Investor',
        'email' => 'mobile.investor@example.com',
        'password' => Hash::make('Password1!'),
        'account_status' => 'active',
        'email_verified_at' => now(),
    ]);
    $this->investor->assignRole('investor');
    UserProfile::query()->create([
        'user_id' => $this->investor->id,
        'country' => 'Pakistan',
        'company_name' => 'Mobile Capital',
    ]);
    Wallet::query()->create([
        'user_id' => $this->investor->id,
        'currency' => 'PKR',
        'available_balance' => 0,
        'pending_balance' => 0,
    ]);
});

it('allows CORS preflight for mobile login from Flutter web', function () {
    $origin = 'http://127.0.0.1:5055';

    $this->withHeaders([
        'Origin' => $origin,
        'Access-Control-Request-Method' => 'POST',
        'Access-Control-Request-Headers' => 'content-type,authorization',
    ])->options('/api/auth/mobile/login')
        ->assertNoContent()
        ->assertHeader('Access-Control-Allow-Origin', $origin)
        ->assertHeader('Access-Control-Allow-Credentials', 'true');
});

it('issues a sanctum token on mobile login', function () {
    $response = $this->postJson('/api/auth/mobile/login', [
        'email' => 'mobile.investor@example.com',
        'password' => 'Password1!',
        'device_name' => 'flutter_test',
    ])->assertOk()
        ->assertJsonPath('token_type', 'Bearer')
        ->assertJsonStructure(['token', 'user', 'message']);

    expect($response->json('token'))->toBeString()->not->toBeEmpty();
});

it('issues a sanctum token via mobile v1 auth login alias', function () {
    $response = $this->postJson('/api/mobile/v1/auth/login', [
        'email' => 'mobile.investor@example.com',
        'password' => 'Password1!',
        'device_name' => 'flutter_test',
    ])->assertOk()
        ->assertJsonPath('token_type', 'Bearer')
        ->assertJsonStructure(['token', 'user', 'message']);

    expect($response->json('token'))->toBeString()->not->toBeEmpty();
});

it('sends a branded HTML sign-in code with a plain-text fallback', function () {
    $this->investor->forceFill(['two_factor_enabled' => true])->save();
    $email = [];

    Mail::shouldReceive('send')
        ->once()
        ->with([], [], \Mockery::on(function ($callback) use (&$email) {
            $message = \Mockery::mock();
            $message->shouldReceive('to')->once()
                ->with('mobile.investor@example.com')->andReturnSelf();
            $message->shouldReceive('subject')->once()
                ->with(\Mockery::on(function ($subject) use (&$email) {
                    $email['subject'] = $subject;

                    return true;
                }))->andReturnSelf();
            $message->shouldReceive('html')->once()
                ->with(\Mockery::on(function ($html) use (&$email) {
                    $email['html'] = $html;

                    return true;
                }))->andReturnSelf();
            $message->shouldReceive('text')->once()
                ->with(\Mockery::on(function ($text) use (&$email) {
                    $email['text'] = $text;

                    return true;
                }))->andReturnSelf();

            $callback($message);

            return true;
        }));

    $this->postJson('/api/auth/mobile/login', [
        'email' => 'mobile.investor@example.com',
        'password' => 'Password1!',
        'device_name' => 'og_exports_test',
    ])->assertOk()->assertJsonPath('requires_2fa', true);

    expect($email['subject'])->toBe('OG Exports | Your sign-in code')
        ->and($email['html'])->toContain('OG EXPORTS', 'Verify your sign-in', 'Keep your account secure')
        ->and($email['text'])->toContain('INVESTOR ACCOUNT SECURITY', 'This code expires in 10 minutes');

    preg_match('/(?<!\d)\d{6}(?!\d)/', $email['text'], $matches);
    expect($matches)->toHaveCount(1)
        ->and($email['html'])->toContain($matches[0]);
});

it('returns mobile bootstrap payload', function () {
    $this->getJson('/api/mobile/v1/bootstrap')
        ->assertOk()
        ->assertJsonPath('data.app', 'OG Exports Investor')
        ->assertJsonStructure([
            'data' => [
                'investment_module_enabled',
                'supported_currencies',
                'auth' => ['login', 'aliases'],
            ],
        ]);
});

it('rejects invalid mobile login credentials', function () {
    $this->postJson('/api/auth/mobile/login', [
        'email' => 'mobile.investor@example.com',
        'password' => 'wrong-password',
    ])->assertStatus(422);
});

it('accesses investor dashboard with bearer token', function () {
    $token = $this->investor->createToken('flutter_test')->plainTextToken;

    $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/investor/dashboard')
        ->assertOk()
        ->assertJsonStructure(['data' => ['summary', 'wallet']]);
});

it('revokes token on mobile logout', function () {
    $accessToken = $this->investor->createToken('flutter_logout');
    $token = $accessToken->plainTextToken;

    expect($this->investor->tokens()->count())->toBe(1);

    $this->withHeader('Authorization', 'Bearer '.$token)
        ->postJson('/api/auth/mobile/logout')
        ->assertOk()
        ->assertJsonPath('message', 'Logged out successfully.');

    expect($this->investor->fresh()->tokens()->count())->toBe(0);
});
