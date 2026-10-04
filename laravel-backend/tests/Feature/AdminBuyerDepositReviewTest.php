<?php

use App\Models\Order;
use App\Models\User;
use Database\Seeders\PaymentMethodSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->seed(PaymentMethodSeeder::class);

    $this->admin = User::factory()->create(['account_status' => 'active']);
    $this->admin->assignRole('admin');

    $this->buyer = User::factory()->create(['account_status' => 'active']);
    $this->buyer->assignRole('buyer');
});

it('lists buyer mark-as-paid submissions on admin buyer deposits', function () {
    $order = Order::query()->create([
        'order_number' => 'ORD-BUYDEP1',
        'buyer_id' => $this->buyer->id,
        'status' => 'order_confirmed',
        'payment_status' => 'unpaid',
        'total_value' => 25000,
        'currency' => 'USD',
        'placed_at' => now(),
    ]);

    $this->actingAs($this->buyer)
        ->postJson("/api/buyer/payments/orders/{$order->id}/mark-paid", [
            'payment_method' => 'lc',
            'payment_field1' => 'Habib Bank',
            'payment_field2' => 'LC-7788',
        ])
        ->assertOk()
        ->assertJsonPath('data.payment_field1_value', 'Habib Bank')
        ->assertJsonPath('data.payment_field2_value', 'LC-7788')
        ->assertJsonPath('data.review_status', 'pending');

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->getJson('/api/admin/finance/buyer-deposits')
        ->assertOk()
        ->assertJsonPath('data.0.order_number', 'ORD-BUYDEP1')
        ->assertJsonPath('data.0.payment_field1_value', 'Habib Bank')
        ->assertJsonPath('data.0.review_status', 'pending');
});

it('allows admin to approve reject and cancel buyer deposits with user-visible status', function () {
    $order = Order::query()->create([
        'order_number' => 'ORD-BUYDEP2',
        'buyer_id' => $this->buyer->id,
        'status' => 'order_confirmed',
        'payment_status' => 'pending_verification',
        'payment_method' => 'Letter of Credit (LC at Sight)',
        'payment_method_code' => 'lc',
        'payment_field1_label' => 'LC Issuing Bank Name',
        'payment_field1_value' => 'Meezan Bank',
        'payment_field2_label' => 'LC Draft Number (optional)',
        'payment_field2_value' => 'LC-100',
        'payment_reference' => 'LC-100',
        'payment_submitted_at' => now(),
        'total_value' => 12000,
        'currency' => 'USD',
        'placed_at' => now(),
    ]);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/finance/buyer-deposits/{$order->id}/approve")
        ->assertOk()
        ->assertJsonPath('data.review_status', 'approved');

    $this->actingAs($this->buyer)
        ->getJson('/api/buyer/payments/history')
        ->assertOk()
        ->assertJsonPath('data.0.review_status', 'approved');

    $rejected = Order::query()->create([
        'order_number' => 'ORD-BUYDEP3',
        'buyer_id' => $this->buyer->id,
        'status' => 'order_confirmed',
        'payment_status' => 'pending_verification',
        'payment_method' => 'Letter of Credit (LC at Sight)',
        'payment_method_code' => 'lc',
        'payment_field1_value' => 'UBL',
        'payment_submitted_at' => now(),
        'total_value' => 5000,
        'currency' => 'USD',
        'placed_at' => now(),
    ]);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/finance/buyer-deposits/{$rejected->id}/reject")
        ->assertOk()
        ->assertJsonPath('data.review_status', 'rejected');

    // Buyer can resubmit after reject
    $this->actingAs($this->buyer)
        ->postJson("/api/buyer/payments/orders/{$rejected->id}/mark-paid", [
            'payment_method' => 'lc',
            'payment_field1' => 'UBL Updated',
        ])
        ->assertOk()
        ->assertJsonPath('data.review_status', 'pending');
});
