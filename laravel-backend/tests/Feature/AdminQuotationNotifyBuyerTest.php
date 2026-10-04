<?php

use App\Models\AppNotification;
use App\Models\EmailTemplate;
use App\Models\Rfq;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    EmailTemplate::query()->updateOrCreate(
        ['slug' => 'quotation_sent'],
        [
            'subject' => '{{app_name}} — Quotation {{quotation_ref}} ({{status}})',
            'body_html' => '<p>Dear {{user_name}},</p><p>Quotation {{quotation_ref}} for {{product_name}}.</p>',
            'body_text' => 'Dear {{user_name}}, Quotation {{quotation_ref}} for {{product_name}}.',
            'placeholders' => ['user_name', 'quotation_ref', 'product_name', 'qty', 'incoterm', 'total', 'status', 'portal_url', 'app_name'],
            'is_active' => true,
        ]
    );

    $this->admin = User::factory()->create(['account_status' => 'active', 'name' => 'Admin']);
    $this->admin->assignRole('admin');

    $this->buyer = User::factory()->create([
        'account_status' => 'active',
        'name' => 'Buyer User',
        'email' => 'buyer@quote.test',
    ]);
    $this->buyer->assignRole('buyer');

    $this->rfq = Rfq::query()->create([
        'buyer_id' => $this->buyer->id,
        'product_name' => 'Basmati Rice',
        'qty' => '50 MT',
        'incoterm' => 'CIF',
        'payment_terms' => 'LC at Sight',
        'destination' => 'Rotterdam',
        'status' => 'pending',
        'submitted_at' => now(),
        'required_delivery_date' => now()->addDays(45),
    ]);
});

it('notifies buyer when admin creates and sends a quotation', function () {
    Mail::fake();

    $this->actingAs($this->admin)
        ->postJson("/api/admin/rfqs/{$this->rfq->id}/quotations", [
            'qty_mt' => 50,
            'incoterm' => 'CIF',
            'destination' => 'Rotterdam',
            'payment_terms' => 'LC at Sight',
            'fob_unit_price' => 700,
            'freight' => 2000,
            'insurance' => 500,
            'doc_fee' => 150,
            'send' => true,
            'valid_until' => now()->addDays(7)->toDateString(),
        ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'sent');

    $notification = AppNotification::query()
        ->where('user_id', $this->buyer->id)
        ->where('type', 'quotation')
        ->first();

    expect($notification)->not->toBeNull()
        ->and($notification->title)->toContain('QT-')
        ->and($notification->data['href'] ?? null)->toBe('/buyer/quotations');
});

it('notifies buyer when admin sends an existing draft quotation', function () {
    Mail::fake();

    $create = $this->actingAs($this->admin)
        ->postJson("/api/admin/rfqs/{$this->rfq->id}/quotations", [
            'qty_mt' => 50,
            'fob_unit_price' => 680,
            'send' => false,
        ])
        ->assertCreated();

    $quotationId = $create->json('data.id');

    expect(AppNotification::query()->where('user_id', $this->buyer->id)->count())->toBe(0);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/quotations/{$quotationId}/send")
        ->assertOk()
        ->assertJsonPath('data.status', 'sent');

    expect(AppNotification::query()
        ->where('user_id', $this->buyer->id)
        ->where('type', 'quotation')
        ->count())->toBe(1);
});
