<?php

use App\Models\InvestorPushToken;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Support\InvestorExpoPush;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

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

    $this->investor = User::factory()->create(['account_status' => 'active']);
    $this->investor->assignRole('investor');
});

it('registers an Expo token for the authenticated investor and reactivates it idempotently', function () {
    $token = 'ExponentPushToken[Abcdefghijklmnopqrstuv1234567890]';
    $payload = ['expo_push_token' => $token, 'platform' => 'android'];

    $this->actingAs($this->investor)
        ->postJson('/api/investor/push-tokens/register', $payload)
        ->assertOk()
        ->assertExactJson(['success' => true]);

    InvestorPushToken::query()->where('expo_push_token', $token)->update(['revoked_at' => now()]);

    $this->actingAs($this->investor)
        ->postJson('/api/investor/push-tokens/register', $payload)
        ->assertOk();

    $this->assertDatabaseCount('investor_push_tokens', 1);
    $this->assertDatabaseHas('investor_push_tokens', [
        'user_id' => $this->investor->id,
        'expo_push_token' => $token,
        'platform' => 'android',
        'revoked_at' => null,
    ]);
});

it('revokes only the authenticated investor own Expo token', function () {
    $token = 'ExponentPushToken[Abcdefghijklmnopqrstuv1234567890]';
    $owner = InvestorPushToken::query()->create([
        'user_id' => $this->investor->id,
        'expo_push_token' => $token,
        'platform' => 'ios',
    ]);
    $otherInvestor = User::factory()->create(['account_status' => 'active']);
    $otherInvestor->assignRole('investor');

    $this->actingAs($otherInvestor)
        ->postJson('/api/investor/push-tokens/revoke', ['expo_push_token' => $token])
        ->assertOk()
        ->assertJson(['success' => true, 'revoked' => false]);

    expect($owner->fresh()->revoked_at)->toBeNull();

    $this->actingAs($this->investor)
        ->postJson('/api/investor/push-tokens/revoke', ['expo_push_token' => $token])
        ->assertOk()
        ->assertJson(['success' => true, 'revoked' => true]);

    expect($owner->fresh()->revoked_at)->not->toBeNull();
});

it('rejects malformed Expo tokens', function () {
    $this->actingAs($this->investor)
        ->postJson('/api/investor/push-tokens/register', [
            'expo_push_token' => 'not-an-expo-token',
            'platform' => 'android',
        ])
        ->assertUnprocessable();
});

it('rejects unauthenticated registration', function () {
    $this->postJson('/api/investor/push-tokens/register', [
        'expo_push_token' => 'ExponentPushToken[Abcdefghijklmnopqrstuv1234567890]',
        'platform' => 'android',
    ])->assertUnauthorized();
});

it('sends registered devices through Expo and retires unregistered tokens', function () {
    $token = InvestorPushToken::query()->create([
        'user_id' => $this->investor->id,
        'expo_push_token' => 'ExponentPushToken[Abcdefghijklmnopqrstuv1234567890]',
        'platform' => 'android',
    ]);
    Http::fake([
        'https://exp.host/--/api/v2/push/send' => Http::response([
            'data' => [[
                'status' => 'error',
                'details' => ['error' => 'DeviceNotRegistered'],
            ]],
        ]),
    ]);

    $accepted = InvestorExpoPush::send($this->investor, 'Test update', 'A test message.', [
        'href' => '/account/notifications',
    ]);

    expect($accepted)->toBe(0)
        ->and($token->fresh()->revoked_at)->not->toBeNull();

    Http::assertSent(fn ($request) => $request->url() === 'https://exp.host/--/api/v2/push/send'
        && $request->data()[0]['to'] === $token->expo_push_token
        && $request->data()[0]['channelId'] === 'investor-updates');
});
