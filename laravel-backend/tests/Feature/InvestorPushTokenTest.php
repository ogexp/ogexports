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
use Illuminate\Support\Facades\Log;

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

it('logs safe Expo ticket error codes without exposing device tokens', function () {
    InvestorPushToken::query()->create([
        'user_id' => $this->investor->id,
        'expo_push_token' => 'ExponentPushToken[Abcdefghijklmnopqrstuv1234567890]',
        'platform' => 'android',
    ]);
    Http::fake([
        'https://exp.host/--/api/v2/push/send' => Http::response([
            'data' => [[
                'status' => 'error',
                'details' => ['error' => 'InvalidCredentials'],
            ]],
        ]),
    ]);
    Log::spy();

    expect(InvestorExpoPush::send($this->investor, 'Private title', 'Private body'))->toBe(0);

    Log::shouldHaveReceived('warning')
        ->with('Expo rejected an investor push ticket.', Mockery::on(
            fn (array $context): bool => ($context['platform'] ?? null) === 'android'
                && ($context['error_code'] ?? null) === 'InvalidCredentials'
                && ! array_key_exists('expo_push_token', $context)
                && ! array_key_exists('body', $context),
        ))
        ->once();
});

it('uses branded privacy-safe lock-screen copy for investor status updates', function () {
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
            InvestorNotificationTypes::DEPOSIT,
            'Deposit completed',
            'Private payment metadata.',
            'Deposit confirmed',
            'Your deposit has been approved and added to your wallet.',
            ['transaction_status' => 'completed', 'amount' => 1000],
        ],
        [
            InvestorNotificationTypes::DEPOSIT_SUBMITTED,
            'Deposit submitted with private amount',
            'Private transaction details.',
            'Deposit request received',
            'Your deposit is under review. We will share the next update in OG Exports.',
            ['deposit_id' => 31, 'amount' => 1000, 'reference' => 'OGDEP-INV-031'],
        ],
        [
            InvestorNotificationTypes::DEPOSIT_APPROVED,
            'Deposit approved — USD 1,000.00',
            'Your deposit was credited. Private reference: OGDEP-INV-035.',
            'Deposit confirmed',
            'Your deposit has been approved and added to your wallet.',
            ['deposit_id' => 35, 'amount' => 1000, 'reference' => 'OGDEP-INV-035'],
        ],
        [
            InvestorNotificationTypes::DEPOSIT_REJECTED,
            'Deposit rejected',
            'Private rejection reason.',
            'Deposit requires attention',
            'Open OG Exports to review the decision and next steps.',
            ['deposit_id' => 36, 'reason' => 'private reason'],
        ],
        [
            InvestorNotificationTypes::DEPOSIT_CANCELLED,
            'Deposit cancelled',
            'Private transaction details.',
            'Deposit request closed',
            'This request was cancelled. View the update in OG Exports.',
            ['deposit_id' => 37],
        ],
        [
            InvestorNotificationTypes::WITHDRAWAL,
            'Withdrawal processing',
            'Private payout metadata.',
            'Withdrawal processing',
            'Your payout is being processed. Track its status in OG Exports.',
            ['status' => 'processing', 'amount' => 100],
        ],
        [
            InvestorNotificationTypes::WITHDRAWAL_SUBMITTED,
            'Withdrawal submitted',
            'Private amount and bank details.',
            'Withdrawal request received',
            'Your request is under review. Follow its progress in OG Exports.',
            ['withdrawal_id' => 15, 'amount' => 100],
        ],
        [
            InvestorNotificationTypes::WITHDRAWAL_APPROVED,
            'Withdrawal approved',
            'Private bank details.',
            'Withdrawal approved',
            'Your request has been approved. Check OG Exports for payout details.',
            ['withdrawal_id' => 15, 'bank_details' => 'private'],
        ],
        [
            InvestorNotificationTypes::WITHDRAWAL,
            'Withdrawal paid',
            'Private transfer metadata.',
            'Withdrawal completed',
            'Your payout is marked complete. View the final update in OG Exports.',
            ['status' => 'paid', 'amount' => 100],
        ],
        [
            InvestorNotificationTypes::WITHDRAWAL_REJECTED,
            'Withdrawal rejected — 100.00',
            'Private rejection reason and bank details.',
            'Withdrawal requires attention',
            'Open OG Exports to review the decision and next steps.',
            ['withdrawal_id' => 16, 'amount' => 100, 'reference' => 'OGWITH-INV-016'],
        ],
        [
            InvestorNotificationTypes::WITHDRAWAL_CANCELLED,
            'Withdrawal cancelled',
            'Private cancellation details.',
            'Withdrawal request closed',
            'Your request was cancelled. View the update in OG Exports.',
            ['withdrawal_id' => 17, 'reason' => 'private'],
        ],
        [
            InvestorNotificationTypes::OPPORTUNITY_PUBLISHED,
            'New opportunity: Private Project Name',
            'Detailed project terms and expected returns.',
            'New trade opportunity',
            'A new opportunity is available. Explore its details in OG Exports.',
            ['project_id' => 7, 'expected_return_pct' => 18],
        ],
        [
            InvestorNotificationTypes::SHIPMENT_UPDATE,
            'Private project milestone',
            'Detailed trade information.',
            'Trade milestone: In transit',
            'A new trade update is ready. Open OG Exports for the latest details.',
            ['project_id' => 8, 'status' => 'in_transit'],
        ],
        [
            InvestorNotificationTypes::UPDATE,
            'Opportunity now funding',
            'Private project terms.',
            'Opportunity updated: Funding open',
            'A trade opportunity status changed. Open OG Exports for details.',
            ['project_id' => 8, 'status' => 'funding'],
        ],
        [
            InvestorNotificationTypes::KYC_SUBMITTED,
            'Verification submitted',
            'Private identity document details.',
            'Verification started',
            'Your documents were received. Check OG Exports for any remaining steps.',
            ['kyc_id' => 9, 'document_name' => 'private'],
        ],
        [
            InvestorNotificationTypes::KYC_APPROVED,
            'KYC approved',
            'Private identity details.',
            'Verification approved',
            'Your investor profile is now verified. Continue securely in OG Exports.',
            ['kyc_id' => 9],
        ],
        [
            InvestorNotificationTypes::KYC_REJECTED,
            'KYC rejected',
            'Private compliance notes.',
            'Verification needs attention',
            'Open OG Exports to review the decision and next steps.',
            ['kyc_id' => 9, 'notes' => 'private compliance notes'],
        ],
        [
            InvestorNotificationTypes::SUPPORT_TICKET,
            'Reply on ticket 123',
            'Private support reply text.',
            'Support reply received',
            'The OG Exports support team has replied. Open the app to continue.',
            ['ticket_id' => 123, 'support_event' => 'reply', 'message' => 'private'],
        ],
        [
            InvestorNotificationTypes::SUPPORT_TICKET,
            'Ticket 123 closed',
            'Private ticket details.',
            'Support request updated',
            'Your support request is now Closed. Open OG Exports for details.',
            ['ticket_id' => 123, 'support_event' => 'status_changed', 'status' => 'closed'],
        ],
        [
            InvestorNotificationTypes::NEW_MESSAGE,
            'New message from OGSupport',
            'Private message preview.',
            'Support message received',
            'A new message from OG Exports is ready. Open the app to continue.',
            ['conversation_id' => 4, 'message' => 'private'],
        ],
        [
            InvestorNotificationTypes::INVESTMENT_APPROVED,
            'Investment approved',
            'Private investment amount and reference.',
            'Investment approved',
            'Your investment has been approved. Open OG Exports to review its status.',
            ['investment_id' => 16, 'amount' => 500],
        ],
        [
            InvestorNotificationTypes::INVESTMENT_REJECTED,
            'Investment rejected',
            'Private decision details.',
            'Investment update',
            'Open OG Exports to review the decision and wallet update.',
            ['investment_id' => 17, 'notes' => 'private'],
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
        ->values();

    expect($sentPayloads)->toHaveCount(count($notifications));

    foreach ($notifications as $index => $notification) {
        expect($sentPayloads[$index]['title'])->toBe($notification[3])
            ->and($sentPayloads[$index]['body'])->toBe($notification[4])
            ->and($sentPayloads[$index]['data'])->not->toHaveKey('amount')
            ->and($sentPayloads[$index]['data'])->not->toHaveKey('notes')
            ->and($sentPayloads[$index]['data'])->not->toHaveKey('message');
    }

    expect($sentPayloads[2]['data']['deposit_id'])->toBe('35')
        ->and($sentPayloads[11]['data']['project_id'])->toBe('7')
        ->and($sentPayloads[13]['data'])->not->toHaveKey('status')
        ->and($sentPayloads[17]['data'])->not->toHaveKey('support_event');
});

it('can deliver a push-only event without creating a feed row', function () {
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

    InvestorPushBridge::sendPushOnly(
        $this->investor,
        InvestorNotificationTypes::DEPOSIT_APPROVED,
        ['deposit_id' => 35, 'amount' => 1000, 'href' => '/invest/transactions/deposit/35'],
    );

    expect(AppNotification::query()->where('user_id', $this->investor->id)->count())->toBe(0);
    Http::assertSent(fn ($request) => $request->url() === 'https://exp.host/--/api/v2/push/send'
        && $request->data()[0]['title'] === 'Deposit confirmed'
        && $request->data()[0]['body'] === 'Your deposit has been approved and added to your wallet.'
        && $request->data()[0]['data']['href'] === '/invest/transactions/deposit/35'
        && ! array_key_exists('amount', $request->data()[0]['data']));
});
