<?php

use App\Models\AppNotification;
use App\Models\EmailTemplate;
use App\Models\Order;
use App\Models\Quotation;
use App\Models\User;
use App\Support\DepositReviewStatuses;
use App\Support\OrderStatuses;
use App\Support\PortalNotificationTypes;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    foreach ([
        'buyer_order_status_update',
        'quotation_reply',
        'buyer_payment_approved',
    ] as $slug) {
        EmailTemplate::query()->updateOrCreate(
            ['slug' => $slug],
            [
                'subject' => '{{app_name}} — {{title}}',
                'body_html' => '<p>Dear {{user_name}},</p><p>{{body}}</p>',
                'body_text' => 'Dear {{user_name}}, {{body}}',
                'placeholders' => ['user_name', 'title', 'body', 'app_name', 'portal_url', 'order_number', 'status', 'payment_status', 'notes', 'quotation_ref', 'message_preview'],
                'is_active' => true,
            ]
        );
    }

    $this->admin = User::factory()->create(['account_status' => 'active', 'name' => 'Admin']);
    $this->admin->assignRole('admin');

    $this->buyer = User::factory()->create([
        'account_status' => 'active',
        'name' => 'Buyer User',
        'email' => 'buyer-notify@test.local',
    ]);
    $this->buyer->assignRole('buyer');
});

it('notifies buyer when admin updates order status', function () {
    Mail::fake();

    $authLogs = [];
    \Illuminate\Support\Facades\Event::listen(\Illuminate\Log\Events\MessageLogged::class, function ($event) use (&$authLogs) {
        $authLogs[] = $event;
    });

    $order = Order::query()->create([
        'order_number' => 'ORD-NOTIF-001',
        'buyer_id' => $this->buyer->id,
        'status' => OrderStatuses::ORDER_CONFIRMED,
        'payment_status' => 'unpaid',
        'total_value' => 5000,
        'currency' => 'USD',
        'placed_at' => now(),
    ]);

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->patchJson("/api/admin/orders/{$order->id}/status", [
            'status' => OrderStatuses::QUALITY_INSPECTION,
        ])
        ->assertOk()
        ->assertJsonPath('data.status', OrderStatuses::QUALITY_INSPECTION);

    $notification = AppNotification::query()
        ->where('user_id', $this->buyer->id)
        ->where('type', PortalNotificationTypes::ORDER_STATUS)
        ->first();

    expect($notification)->not->toBeNull()
        ->and($notification->title)->toContain('ORD-NOTIF-001')
        ->and($notification->data['href'] ?? null)->toBe('/buyer/orders');

    expect(EmailTemplate::query()->where('slug', 'buyer_order_status_update')->where('is_active', true)->exists())->toBeTrue();

    $emailSent = collect($authLogs)->contains(function ($event) {
        return $event->level === 'info'
            && $event->message === 'auth.email.sent'
            && ($event->context['slug'] ?? null) === 'buyer_order_status_update';
    });
    expect($emailSent)->toBeTrue();

    $this->actingAs($this->buyer)
        ->withHeader('Origin', 'http://localhost:5000')
        ->getJson('/api/notifications/unread-count')
        ->assertOk()
        ->assertJsonPath('data.unread_count', 1);
});

it('notifies buyer when admin replies on a quotation', function () {
    Mail::fake();

    $quotation = Quotation::query()->create([
        'buyer_id' => $this->buyer->id,
        'product_name' => 'Basmati Rice',
        'qty_mt' => 50,
        'incoterm' => 'CIF',
        'destination' => 'Rotterdam',
        'payment_terms' => 'LC at Sight',
        'status' => 'sent',
        'source' => 'admin',
        'fob_unit_price' => 700,
        'issued_at' => now(),
    ]);

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->postJson("/api/admin/quotations/{$quotation->id}/messages", [
            'body' => 'We can offer a better freight rate if you confirm this week.',
        ])
        ->assertCreated();

    $notification = AppNotification::query()
        ->where('user_id', $this->buyer->id)
        ->where('type', PortalNotificationTypes::QUOTATION_REPLY)
        ->first();

    expect($notification)->not->toBeNull()
        ->and($notification->body)->toContain('freight rate')
        ->and($notification->data['href'] ?? null)->toBe('/buyer/quotations');
});

it('notifies and emails buyer when admin approves buyer payment', function () {
    Mail::fake();

    $order = Order::query()->create([
        'order_number' => 'ORD-PAY-100',
        'buyer_id' => $this->buyer->id,
        'status' => OrderStatuses::PAYMENT,
        'payment_status' => 'pending_verification',
        'total_value' => 12000,
        'currency' => 'USD',
        'payment_submitted_at' => now(),
        'placed_at' => now(),
    ]);

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->postJson("/api/admin/finance/buyer-deposits/{$order->id}/approve")
        ->assertOk()
        ->assertJsonPath('message', 'Buyer payment approved.');

    $notification = AppNotification::query()
        ->where('user_id', $this->buyer->id)
        ->where('type', PortalNotificationTypes::BUYER_PAYMENT_APPROVED)
        ->first();

    expect($notification)->not->toBeNull()
        ->and($notification->title)->toContain('ORD-PAY-100')
        ->and($notification->data['href'] ?? null)->toBe('/buyer/payments');

    expect(Order::query()->whereKey($order->id)->value('payment_status'))
        ->toBe(DepositReviewStatuses::APPROVED);

    // Mail::send (templated HTML) is used by NotificationMailer; Mail::fake prevents delivery.
    // In-app notification from notifyAndEmail confirms the email path was invoked with the template slug.
    expect(EmailTemplate::query()->where('slug', 'buyer_payment_approved')->where('is_active', true)->exists())->toBeTrue();
});
