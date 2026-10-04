<?php

use App\Models\Deposit;
use App\Models\Investment;
use App\Models\InvestmentProfitDistribution;
use App\Models\InvestmentProject;
use App\Models\Order;
use App\Models\User;
use App\Models\Wallet;
use App\Models\Withdrawal;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->admin = User::factory()->create(['account_status' => 'active']);
    $this->admin->assignRole('admin');
});

it('returns zeroed finance stats when the database has no transactional data', function () {
    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/finance/stats')
        ->assertOk();

    $data = $response->json('data');

    expect($data['monthly_revenue'])->toBe(0)
        ->and($data['monthly_revenue_mom_pct'])->toBe(0)
        ->and($data['monthly_withdrawals'])->toBe(0)
        ->and($data['platform_balance'])->toBe(0)
        ->and($data['total_investors'])->toBe(0)
        ->and($data['avg_portfolio'])->toBe(0)
        ->and($data['cumulative_returns'])->toBe(0)
        ->and($data['cashflow'])->toHaveCount(7);

    foreach ($data['cashflow'] as $point) {
        expect($point['deposits'])->toBe(0)
            ->and($point['withdrawals'])->toBe(0)
            ->and($point['profit'])->toBe(0);
    }
});

it('returns live finance stats from seeded deposits withdrawals and investments', function () {
    $buyer = User::factory()->create(['account_status' => 'active']);
    $buyer->assignRole('buyer');

    $investor = User::factory()->create(['account_status' => 'active']);
    $investor->assignRole('investor');

    Order::query()->create([
        'order_number' => 'ORD-FIN-1',
        'buyer_id' => $buyer->id,
        'status' => 'delivered',
        'payment_status' => 'paid',
        'total_value' => 25000,
        'currency' => 'USD',
        'placed_at' => now(),
    ]);

    Wallet::query()->create([
        'user_id' => $investor->id,
        'currency' => 'USD',
        'available_balance' => 1000,
        'pending_balance' => 200,
    ]);

    Deposit::query()->create([
        'investor_id' => $investor->id,
        'amount' => 5000,
        'currency' => 'USD',
        'method' => 'bank_transfer',
        'reference' => 'DEP-FIN-1',
        'status' => 'approved',
        'reviewed_at' => now(),
    ]);

    Withdrawal::query()->create([
        'investor_id' => $investor->id,
        'amount' => 1500,
        'reference' => 'WD-FIN-1',
        'status' => 'approved',
        'reviewed_at' => now(),
    ]);

    $project = InvestmentProject::query()->create([
        'title' => 'Container Test',
        'type' => 'container',
        'status' => 'active',
        'target_amount' => 100000,
        'expected_return_pct' => 20,
    ]);

    $investment = Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $investor->id,
        'amount' => 10000,
        'status' => 'active',
        'invested_at' => now(),
    ]);

    InvestmentProfitDistribution::query()->create([
        'investment_id' => $investment->id,
        'project_id' => $project->id,
        'investor_id' => $investor->id,
        'project_type' => 'container',
        'invested_amount' => 10000,
        'profit_amount' => 2000,
        'total_return' => 12000,
        'roi_pct' => 20,
        'distributed_at' => now(),
    ]);

    $response = $this->actingAs($this->admin)
        ->getJson('/api/admin/finance/stats')
        ->assertOk();

    $data = $response->json('data');

    expect($data['monthly_revenue'])->toBe(25000)
        ->and($data['monthly_withdrawals'])->toBe(1500)
        ->and($data['platform_balance'])->toBe(1200)
        ->and($data['total_investors'])->toBe(1)
        ->and($data['avg_portfolio'])->toBe(10000)
        ->and($data['cumulative_returns'])->toBe(2000)
        ->and($data['cashflow'])->toHaveCount(7);

    $currentMonth = collect($data['cashflow'])->last();
    expect($currentMonth['deposits'])->toBeGreaterThanOrEqual(5000)
        ->and($currentMonth['withdrawals'])->toBe(1500)
        ->and($currentMonth['profit'])->toBe(2000);
});

it('blocks non-admin users from finance stats', function () {
    $buyer = User::factory()->create(['account_status' => 'active']);
    $buyer->assignRole('buyer');

    $this->actingAs($buyer)
        ->getJson('/api/admin/finance/stats')
        ->assertStatus(403);
});
