<?php

use App\Models\InvestorPushToken;
use App\Models\AppNotification;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Support\InvestorExpoPush;
use App\Support\InvestorNotificationTypes;
use App\Support\InvestorPushBridge;
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

it('uses privacy-safe lock-screen copy for deposits, withdrawals, and new opportunities', function () {
    InvestorPushToken::query()->create([
        'user_id' => $this->investor->id,
        'expo_push_token' => 'ExponentPushToken[Abcdefghijklmnopqrstuv1234567890]',
        'platform' => 'android',
    ]);

    config([
        'services.investor_push.notification_url' => '',
        'services.investor_push.url' => '',
        'services.investor_push.replit_domains' => '',
        'services.investor_push.session_secret' => '',
    ]);
    Http::fake([
        'https://exp.host/--/api/v2/push/send' => Http::response([
            'data' => [['status' => 'ok']],
        ]),
    ]);

    $notifications = [
        [
            InvestorNotificationTypes::DEPOSIT_APPROVED,
            'Deposit approved — USD 1,000.00',
            'Your deposit was credited. Private reference: OGDEP-INV-035.',
            'Deposit update',
            'Your deposit status changed. Open OG Exports to review the details.',
            ['deposit_id' => 35, 'amount' => 1000, 'reference' => 'OGDEP-INV-035'],
        ],
        [
            InvestorNotificationTypes::WITHDRAWAL_REJECTED,
            'Withdrawal rejected — 100.00',
            'Private rejection reason and bank details.',
            'Withdrawal update',
            'Your withdrawal status changed. Open OG Exports to review the details.',
            ['withdrawal_id' => 16, 'amount' => 100, 'reference' => 'OGWITH-INV-016'],
        ],
        [
            InvestorNotificationTypes::OPPORTUNITY_PUBLISHED,
            'New opportunity: Private Project Name',
            'Detailed project terms and expected returns.',
            'New opportunity',
            'A new trade opportunity is available. Open OG Exports to review it.',
            ['project_id' => 7, 'expected_return_pct' => 18],
        ],
    ];

    foreach ($notifications as [$type, $title, $body, $expectedTitle, $expectedBody, $privateData]) {
        $notification = AppNotification::query()->create([
            'user_id' => $this->investor->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'data' => ['href' => '/account/notifications', ...$privateData],
        ]);

        InvestorPushBridge::sendNotification($this->investor, $notification);
    }

    $sentPayloads = Http::recorded()
        ->map(fn ($record) => $record[0]->data()[0])
        ->keyBy(fn ($payload) => $payload['data']['type']);

    expect($sentPayloads)->toHaveCount(3)
        ->and($sentPayloads[InvestorNotificationTypes::DEPOSIT_APPROVED]['title'])->toBe($notifications[0][3])
        ->and($sentPayloads[InvestorNotificationTypes::DEPOSIT_APPROVED]['body'])->toBe($notifications[0][4])
        ->and($sentPayloads[InvestorNotificationTypes::WITHDRAWAL_REJECTED]['title'])->toBe($notifications[1][3])
        ->and($sentPayloads[InvestorNotificationTypes::WITHDRAWAL_REJECTED]['body'])->toBe($notifications[1][4])
        ->and($sentPayloads[InvestorNotificationTypes::OPPORTUNITY_PUBLISHED]['title'])->toBe($notifications[2][3])
        ->and($sentPayloads[InvestorNotificationTypes::OPPORTUNITY_PUBLISHED]['body'])->toBe($notifications[2][4])
        ->and($sentPayloads[InvestorNotificationTypes::DEPOSIT_APPROVED]['data']['deposit_id'])->toBe('35')
        ->and($sentPayloads[InvestorNotificationTypes::DEPOSIT_APPROVED]['data'])->not->toHaveKey('amount')
        ->and($sentPayloads[InvestorNotificationTypes::WITHDRAWAL_REJECTED]['data']['withdrawal_id'])->toBe('16')
        ->and($sentPayloads[InvestorNotificationTypes::OPPORTUNITY_PUBLISHED]['data']['project_id'])->toBe('7')
        ->and($sentPayloads[InvestorNotificationTypes::OPPORTUNITY_PUBLISHED]['data'])->not->toHaveKey('expected_return_pct');
});
