<?php

use App\Models\AppNotification;
use App\Models\ContactMessage;
use App\Models\Deposit;
use App\Models\Investment;
use App\Models\InvestmentProject;
use App\Models\KycApplication;
use App\Models\User;
use App\Support\AdminModuleKeys;
use App\Support\AdminNotificationTypes;
use App\Support\NotifiesAdmins;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->admin = User::factory()->create(['account_status' => 'active', 'name' => 'Admin']);
    $this->admin->assignRole('admin');

    $this->investor = User::factory()->create(['account_status' => 'active', 'name' => 'New Investor']);
    $this->investor->assignRole('investor');
});

it('returns module counts for admin including new users and kyc', function () {
    // Investor created after epoch → counts toward users badge
    KycApplication::query()->create([
        'user_id' => $this->investor->id,
        'type' => 'investor',
        'status' => 'pending',
        'submitted_at' => now(),
    ]);

    Deposit::query()->create([
        'investor_id' => $this->investor->id,
        'amount' => 1000,
        'currency' => 'USD',
        'status' => 'pending',
        'method' => 'bank_transfer',
    ]);

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->getJson('/api/admin/module-counts')
        ->assertOk()
        ->assertJsonPath('data.users', fn ($v) => $v >= 1)
        ->assertJsonPath('data.compliance', 1)
        ->assertJsonPath('data.investor_deposits', 1);
});

it('clears module count when admin marks module as viewed', function () {
    $this->travelTo(now()->startOfSecond());

    Deposit::query()->create([
        'investor_id' => $this->investor->id,
        'amount' => 500,
        'currency' => 'USD',
        'status' => 'pending',
        'method' => 'bank_transfer',
    ]);

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->getJson('/api/admin/module-counts')
        ->assertOk()
        ->assertJsonPath('data.investor_deposits', 1);

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->postJson('/api/admin/module-views/'.AdminModuleKeys::INVESTOR_DEPOSITS)
        ->assertOk()
        ->assertJsonPath('data.investor_deposits', 0);

    $this->travel(2)->seconds();

    // New deposit after view should bump count again
    Deposit::query()->create([
        'investor_id' => $this->investor->id,
        'amount' => 750,
        'currency' => 'USD',
        'status' => 'pending',
        'method' => 'bank_transfer',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->getJson('/api/admin/module-counts')
        ->assertOk()
        ->assertJsonPath('data.investor_deposits', 1);
});

it('rejects unknown module keys', function () {
    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->postJson('/api/admin/module-views/not_a_real_module')
        ->assertStatus(422);
});

it('returns and clears RFQ and quotation module counts', function () {
    $buyer = User::factory()->create(['account_status' => 'active', 'name' => 'Buyer']);
    $buyer->assignRole('buyer');

    \App\Models\Rfq::query()->create([
        'buyer_id' => $buyer->id,
        'product_name' => 'Basmati Rice',
        'qty' => '100 MT',
        'incoterm' => 'CIF',
        'payment_terms' => 'LC at Sight',
        'destination' => 'Karachi',
        'status' => 'pending',
        'submitted_at' => now(),
        'required_delivery_date' => now()->addDays(30),
    ]);

    \App\Models\Quotation::query()->create([
        'buyer_id' => $buyer->id,
        'product_name' => 'Basmati Rice',
        'qty_mt' => 100,
        'incoterm' => 'CIF',
        'destination' => 'Karachi',
        'payment_terms' => 'LC at Sight',
        'status' => 'draft',
        'source' => 'admin',
        'fob_unit_price' => 650,
    ]);

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->getJson('/api/admin/module-counts')
        ->assertOk()
        ->assertJsonPath('data.orders_rfqs', fn ($v) => $v >= 1)
        ->assertJsonPath('data.quotations_pending', fn ($v) => $v >= 1);

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->postJson('/api/admin/module-views/'.AdminModuleKeys::ORDERS_RFQS)
        ->assertOk()
        ->assertJsonPath('data.orders_rfqs', 0);

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->postJson('/api/admin/module-views/'.AdminModuleKeys::QUOTATIONS_PENDING)
        ->assertOk()
        ->assertJsonPath('data.quotations_pending', 0);
});

it('creates admin notifications via NotifiesAdmins', function () {
    NotifiesAdmins::notify(
        AdminNotificationTypes::USER_REGISTERED,
        'New investor registered: Test',
        'test@example.com just verified.',
        ['href' => '/admin/users']
    );

    expect(AppNotification::query()->where('user_id', $this->admin->id)->count())->toBe(1);

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->getJson('/api/admin/notifications/unread-count')
        ->assertOk()
        ->assertJsonPath('data.unread_count', 1);

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->getJson('/api/admin/notifications')
        ->assertOk()
        ->assertJsonPath('data.0.type', AdminNotificationTypes::USER_REGISTERED);
});

it('marks admin notifications as read', function () {
    NotifiesAdmins::notify(
        AdminNotificationTypes::DEPOSIT_SUBMITTED,
        'New deposit',
        'Pending review',
        ['href' => '/admin/finance?tab=investor-deposits']
    );

    $notification = AppNotification::query()->where('user_id', $this->admin->id)->first();

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->postJson("/api/admin/notifications/{$notification->id}/read")
        ->assertOk();

    expect($notification->fresh()->read_at)->not->toBeNull();

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->getJson('/api/admin/notifications/unread-count')
        ->assertOk()
        ->assertJsonPath('data.unread_count', 0);
});

it('marks all admin notifications as read', function () {
    NotifiesAdmins::notify(AdminNotificationTypes::USER_REGISTERED, 'A', null, null);
    NotifiesAdmins::notify(AdminNotificationTypes::KYC_SUBMITTED, 'B', null, null);

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->postJson('/api/admin/notifications/read-all')
        ->assertOk();

    expect(
        AppNotification::query()->where('user_id', $this->admin->id)->whereNull('read_at')->count()
    )->toBe(0);
});

it('returns module counts for investment types and contact inquiries', function () {
    $produceProject = InvestmentProject::query()->create([
        'title' => 'Produce Project',
        'type' => 'produce',
        'status' => 'funding',
        'target_amount' => 5000,
        'raised_amount' => 0,
        'investors_count' => 0,
    ]);

    $plantProject = InvestmentProject::query()->create([
        'title' => 'Plant Project',
        'type' => 'plant',
        'status' => 'funding',
        'target_amount' => 5000,
        'raised_amount' => 0,
        'investors_count' => 0,
    ]);

    $riceProject = InvestmentProject::query()->create([
        'title' => 'Rice Project',
        'type' => 'ricemill',
        'status' => 'funding',
        'target_amount' => 5000,
        'raised_amount' => 0,
        'investors_count' => 0,
    ]);

    $feedProject = InvestmentProject::query()->create([
        'title' => 'Feed Project',
        'type' => 'feed',
        'status' => 'funding',
        'target_amount' => 5000,
        'raised_amount' => 0,
        'investors_count' => 0,
    ]);

    $containerProject = InvestmentProject::query()->create([
        'title' => 'Container Project',
        'type' => 'container',
        'status' => 'funding',
        'target_amount' => 5000,
        'raised_amount' => 0,
        'investors_count' => 0,
    ]);

    Investment::query()->create([
        'project_id' => $produceProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 100,
        'status' => 'pending',
        'invested_at' => now(),
    ]);
    Investment::query()->create([
        'project_id' => $plantProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 100,
        'status' => 'pending',
        'invested_at' => now(),
    ]);
    Investment::query()->create([
        'project_id' => $riceProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 100,
        'status' => 'pending',
        'invested_at' => now(),
    ]);
    Investment::query()->create([
        'project_id' => $feedProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 100,
        'status' => 'pending',
        'invested_at' => now(),
    ]);
    Investment::query()->create([
        'project_id' => $containerProject->id,
        'investor_id' => $this->investor->id,
        'amount' => 100,
        'status' => 'pending',
        'invested_at' => now(),
    ]);

    ContactMessage::query()->create([
        'name' => 'Inquiry User',
        'email' => 'inquiry@example.com',
        'subject' => 'Hello',
        'message' => 'Need info',
        'status' => 'new',
        'type' => 'contact',
    ]);

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->getJson('/api/admin/module-counts')
        ->assertOk()
        ->assertJsonPath('data.fresh_produce_investments', 1)
        ->assertJsonPath('data.processing_plant_investments', 1)
        ->assertJsonPath('data.rice_mill_investments', 1)
        ->assertJsonPath('data.feed_mill_investments', 1)
        ->assertJsonPath('data.container_investments', 1)
        ->assertJsonPath('data.investments_overview', 5)
        ->assertJsonPath('data.contact_inquiries', 1);
});
