<?php

use App\Models\AppNotification;
use App\Models\Deposit;
use App\Models\Investment;
use App\Models\InvestmentProject;
use App\Models\InvestmentProfitDistribution;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\Withdrawal;
use App\Support\ExchangeRateService;
use App\Support\InvestmentReviewService;
use App\Support\PlatformWalletService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    ExchangeRateService::clearCache();
    config(['currency.fallback_rates' => [
        'USD' => 1,
        'GBP' => 0.79,
        'EUR' => 0.92,
        'CNY' => 7.25,
        'PKR' => 278.5,
        'SAR' => 3.75,
        'AED' => 3.67,
        'OMR' => 0.385,
        'QAR' => 3.64,
    ]]);
    Http::fake(['*' => Http::response(null, 500)]);

    $this->investorA = User::factory()->create([
        'name' => 'Investor Alpha',
        'account_status' => 'active',
    ]);
    $this->investorA->assignRole('investor');
    UserProfile::query()->create([
        'user_id' => $this->investorA->id,
        'country' => 'Pakistan',
        'company_name' => 'Alpha Capital',
    ]);

    $this->investorB = User::factory()->create([
        'name' => 'Investor Beta',
        'account_status' => 'active',
    ]);
    $this->investorB->assignRole('investor');
    UserProfile::query()->create([
        'user_id' => $this->investorB->id,
        'country' => 'United Arab Emirates',
    ]);
});

it('returns zeroed empty dashboard for investor with no records', function () {
    $response = $this->actingAs($this->investorA)
        ->getJson('/api/investor/dashboard')
        ->assertOk()
        ->assertJsonPath('data.summary.total_investment', 0)
        ->assertJsonPath('data.summary.active_investment', 0)
        ->assertJsonPath('data.summary.total_portfolio_value', 0)
        ->assertJsonPath('data.summary.distributed_returns', 0)
        ->assertJsonPath('data.summary.pending_distribution', 0)
        ->assertJsonPath('data.summary.display_currency', 'USD')
        ->assertJsonPath('data.summary.available_balance', 0)
        ->assertJsonPath('data.summary.total_profit_earned', 0)
        ->assertJsonPath('data.summary.monthly_profit', 0)
        ->assertJsonPath('data.summary.lifetime_roi', 0)
        ->assertJsonPath('data.summary.pending_deposits_count', 0)
        ->assertJsonPath('data.summary.pending_withdrawals_count', 0)
        ->assertJsonPath('data.summary.completed_transactions', 0)
        ->assertJsonPath('data.wallet.currency', 'USD')
        ->assertJsonPath('data.benchmark_available', false)
        ->assertJsonPath('data.next_distribution_available', false);

    expect($response->json('data.my_investments'))->toBe([])
        ->and($response->json('data.recent_transactions'))->toBe([])
        ->and($response->json('data.withdrawals'))->toBe([])
        ->and($response->json('data.profit_monthly'))->toBe([])
        ->and($response->json('data.allocation'))->toBe([])
        ->and($response->json('data.portfolio_series.points'))->toBe([]);
});

it('includes the available wallet balance in portfolio value when there are no investments or distributions', function () {
    Wallet::query()->create([
        'user_id' => $this->investorA->id,
        'currency' => 'USD',
        'available_balance' => 800,
        'pending_balance' => 0,
    ]);

    $this->actingAs($this->investorA)
        ->getJson('/api/investor/dashboard')
        ->assertOk()
        ->assertJsonPath('data.summary.total_portfolio_value', 800)
        ->assertJsonPath('data.summary.available_balance', 800)
        ->assertJsonPath('data.summary.distributed_returns', 0)
        ->assertJsonPath('data.summary.pending_distribution', 0)
        ->assertJsonPath('data.summary.display_currency', 'USD');
});

it('does not add confirmed distributed returns twice when they are already in the wallet', function () {
    $wallet = Wallet::query()->create([
        'user_id' => $this->investorA->id,
        'currency' => 'USD',
        'available_balance' => 20,
        'pending_balance' => 0,
    ]);
    $project = InvestmentProject::query()->create([
        'title' => 'Distributed return balance',
        'type' => 'container',
        'status' => 'settled',
        'target_amount' => 100,
        'raised_amount' => 100,
        'investors_count' => 1,
        'expected_return_pct' => 20,
        'min_investment' => 100,
        'investment_period_days' => 30,
    ]);
    $investment = Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorA->id,
        'amount' => 100,
        'status' => 'completed',
        'invested_at' => now()->subDays(30),
    ]);
    InvestmentProfitDistribution::query()->create([
        'investment_id' => $investment->id,
        'project_id' => $project->id,
        'investor_id' => $this->investorA->id,
        'project_type' => 'container',
        'invested_amount' => 100,
        'profit_amount' => 20,
        'total_return' => 120,
        'roi_pct' => 20,
        'distributed_at' => now()->subDay(),
    ]);
    WalletTransaction::query()->create([
        'wallet_id' => $wallet->id,
        'type' => 'distribution',
        'amount' => 20,
        'direction' => 'credit',
        'status' => 'completed',
    ]);

    $this->actingAs($this->investorA)
        ->getJson('/api/investor/dashboard')
        ->assertOk()
        ->assertJsonPath('data.summary.available_balance', 20)
        ->assertJsonPath('data.summary.distributed_returns', 20)
        ->assertJsonPath('data.summary.total_portfolio_value', 20);
});

it('returns scoped dashboard totals lists and analytics for the logged in investor', function () {
    $walletA = Wallet::query()->create([
        'user_id' => $this->investorA->id,
        'currency' => 'PKR',
        'available_balance' => 5000,
        'pending_balance' => 0,
    ]);
    $walletB = Wallet::query()->create([
        'user_id' => $this->investorB->id,
        'currency' => 'USD',
        'available_balance' => 99999,
        'pending_balance' => 0,
    ]);

    $projectA = InvestmentProject::query()->create([
        'title' => 'Basmati Export',
        'type' => 'container',
        'status' => 'active',
        'target_amount' => 100000,
        'raised_amount' => 10000,
        'investors_count' => 1,
        'expected_return_pct' => 10,
        'min_investment' => 1000,
        'port_of_loading' => 'Port Qasim',
        'port_of_discharge' => 'Jebel Ali',
        'investment_period_days' => 60,
    ]);
    $projectB = InvestmentProject::query()->create([
        'title' => 'Beta Only Project',
        'type' => 'plant',
        'status' => 'funding',
        'target_amount' => 200000,
        'raised_amount' => 0,
        'investors_count' => 0,
        'expected_return_pct' => 8,
        'min_investment' => 2000,
    ]);

    Investment::query()->create([
        'project_id' => $projectA->id,
        'investor_id' => $this->investorA->id,
        'amount' => 10000,
        'amount_pkr' => 2785000,
        'exchange_rate' => 278.5,
        'status' => 'active',
        'invested_at' => now()->subDays(10),
    ]);
    Investment::query()->create([
        'project_id' => $projectB->id,
        'investor_id' => $this->investorB->id,
        'amount' => 50000,
        'status' => 'active',
        'invested_at' => now()->subDays(5),
    ]);

    Deposit::query()->create([
        'investor_id' => $this->investorA->id,
        'amount' => 2000,
        'currency' => 'PKR',
        'method' => 'Bank Transfer',
        'reference' => 'DEP-A-1',
        'status' => 'pending',
    ]);
    Deposit::query()->create([
        'investor_id' => $this->investorB->id,
        'amount' => 8000,
        'currency' => 'USD',
        'method' => 'Bank Transfer',
        'reference' => 'DEP-B-1',
        'status' => 'pending',
    ]);

    Withdrawal::query()->create([
        'investor_id' => $this->investorA->id,
        'amount' => 1500,
        'bank_details' => ['bank_name' => 'HBL', 'account_number' => '1234564821'],
        'reference' => 'WD-A-1',
        'status' => 'pending',
    ]);
    Withdrawal::query()->create([
        'investor_id' => $this->investorB->id,
        'amount' => 7000,
        'bank_details' => ['bank_name' => 'ENBD', 'account_number' => '9999'],
        'reference' => 'WD-B-1',
        'status' => 'pending',
    ]);

    WalletTransaction::query()->create([
        'wallet_id' => $walletA->id,
        'type' => 'deposit',
        'amount' => 12000,
        'direction' => 'credit',
        'reference' => 'TXN-A-DEP',
        'status' => 'completed',
        'meta' => ['method' => 'Bank Transfer'],
    ]);
    WalletTransaction::query()->create([
        'wallet_id' => $walletA->id,
        'type' => 'profit',
        'amount' => 500,
        'direction' => 'credit',
        'reference' => 'TXN-A-PROFIT',
        'status' => 'completed',
    ]);
    WalletTransaction::query()->create([
        'wallet_id' => $walletB->id,
        'type' => 'profit',
        'amount' => 9000,
        'direction' => 'credit',
        'reference' => 'TXN-B-PROFIT',
        'status' => 'completed',
    ]);

    AppNotification::query()->create([
        'user_id' => $this->investorA->id,
        'type' => 'deposit',
        'title' => 'Deposit approved',
        'body' => 'Your deposit was credited',
        'created_at' => now(),
    ]);
    AppNotification::query()->create([
        'user_id' => $this->investorB->id,
        'type' => 'deposit',
        'title' => 'Beta notification',
        'body' => 'Should not appear for A',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->investorA)
        ->getJson('/api/investor/dashboard')
        ->assertOk()
        ->assertJsonPath('data.user.name', 'Investor Alpha')
        ->assertJsonPath('data.wallet.currency', 'PKR')
        ->assertJsonPath('data.summary.total_investment', 2785000)
        ->assertJsonPath('data.summary.active_investment', 2785000)
        ->assertJsonPath('data.summary.available_balance', 5000)
        ->assertJsonPath('data.summary.total_profit_earned', 500)
        ->assertJsonPath('data.summary.pending_deposits_count', 1)
        ->assertJsonPath('data.summary.pending_deposits_amount', 2000)
        ->assertJsonPath('data.summary.pending_withdrawals_count', 1)
        ->assertJsonPath('data.summary.pending_withdrawals_amount', 1500)
        ->assertJsonPath('data.summary.completed_transactions', 2)
        ->assertJsonPath('data.summary.lifetime_roi', 0.02);

    $json = $response->json('data');

    expect($json['my_investments'])->toHaveCount(1)
        ->and($json['my_investments'][0]['plan'])->toBe('Basmati Export')
        ->and($json['recent_transactions'])->toHaveCount(2)
        ->and(collect($json['recent_transactions'])->pluck('reference')->all())
        ->not->toContain('TXN-B-PROFIT')
        ->and($json['withdrawals'])->toHaveCount(1)
        ->and($json['withdrawals'][0]['amount'])->toBe(1500)
        ->and($json['notifications'])->toHaveCount(1)
        ->and($json['notifications'][0]['title'])->toBe('Deposit approved')
        ->and($json['profit_monthly'])->not->toBeEmpty()
        ->and($json['allocation'])->not->toBeEmpty()
        ->and(collect($json['allocation'])->sum('value'))->toBeGreaterThan(0)
        ->and($json['portfolio_series']['points'])->not->toBeEmpty()
        ->and($json['opportunities'])->not->toBeEmpty();
});

it('never leaks another investors private dashboard data', function () {
    $walletB = Wallet::query()->create([
        'user_id' => $this->investorB->id,
        'currency' => 'USD',
        'available_balance' => 12345,
        'pending_balance' => 0,
    ]);

    $project = InvestmentProject::query()->create([
        'title' => 'Secret Beta Plant',
        'type' => 'plant',
        'status' => 'active',
        'target_amount' => 50000,
        'raised_amount' => 25000,
        'investors_count' => 1,
        'expected_return_pct' => 12,
    ]);

    Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorB->id,
        'amount' => 25000,
        'status' => 'active',
        'invested_at' => now(),
    ]);

    Withdrawal::query()->create([
        'investor_id' => $this->investorB->id,
        'amount' => 333,
        'bank_details' => ['bank_name' => 'Secret Bank'],
        'reference' => 'WD-SECRET',
        'status' => 'approved',
    ]);

    WalletTransaction::query()->create([
        'wallet_id' => $walletB->id,
        'type' => 'withdrawal',
        'amount' => 333,
        'direction' => 'debit',
        'reference' => 'TXN-SECRET',
        'status' => 'completed',
    ]);

    $response = $this->actingAs($this->investorA)
        ->getJson('/api/investor/dashboard')
        ->assertOk();

    $json = $response->json('data');

    expect($json['summary']['total_investment'])->toBe(0)
        ->and($json['summary']['available_balance'])->toBe(0)
        ->and($json['my_investments'])->toBe([])
        ->and($json['recent_transactions'])->toBe([])
        ->and($json['withdrawals'])->toBe([])
        ->and(collect($json['recent_transactions'])->pluck('reference')->all())->not->toContain('TXN-SECRET')
        ->and(collect($json['withdrawals'])->pluck('reference')->all())->not->toContain('WD-SECRET');
});

it('reflects completed investment stats on the dashboard', function () {
    PlatformWalletService::ensure('PKR');

    Wallet::query()->create([
        'user_id' => $this->investorA->id,
        'currency' => 'PKR',
        'available_balance' => 0,
        'pending_balance' => 0,
    ]);

    $project = InvestmentProject::query()->create([
        'title' => 'Settled Container',
        'type' => 'container',
        'status' => 'in_transit',
        'target_amount' => 100000,
        'raised_amount' => 10000,
        'investors_count' => 1,
        'expected_return_pct' => 10,
        'min_investment' => 1000,
        'investment_period_days' => 60,
    ]);

    $investment = Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorA->id,
        'amount' => 10000,
        'amount_pkr' => 2785000,
        'exchange_rate' => 278.5,
        'status' => 'active',
        'reference' => 'INV-DASH-COMPLETE-1',
        'invested_at' => now()->subDays(30),
        'approved_at' => now()->subDays(30),
    ]);

    // Platform must hold principal + profit for settlement payout (wallet currency = PKR).
    PlatformWalletService::credit(2785000, 'investment_in', 'TEST-PRINCIPAL-'.$investment->id, [], 'PKR');
    PlatformWalletService::credit(278500, 'profit_reserve', 'TEST-PROFIT-'.$investment->id, [], 'PKR');

    app(InvestmentReviewService::class)->complete($investment->fresh());

    $response = $this->actingAs($this->investorA)
        ->getJson('/api/investor/dashboard')
        ->assertOk()
        ->assertJsonPath('data.summary.total_investment', 2785000)
        ->assertJsonPath('data.summary.active_investment', 0)
        ->assertJsonPath('data.summary.active_investments_count', 0)
        ->assertJsonPath('data.summary.total_profit_earned', 278500)
        ->assertJsonPath('data.summary.total_profit_earned_usd', 1000)
        ->assertJsonPath('data.summary.monthly_profit', 278500)
        ->assertJsonPath('data.summary.monthly_profit_usd', 1000)
        ->assertJsonPath('data.summary.lifetime_roi', 10)
        ->assertJsonPath('data.benchmark_available', true)
        ->assertJsonPath('data.next_distribution_available', false);

    $json = $response->json('data');

    expect($json['portfolio_series']['points'])->not->toBeEmpty()
        ->and((float) collect($json['portfolio_series']['points'])->max('profit'))->toBe(278500.0)
        ->and($json['benchmark_series']['points'])->not->toBeEmpty()
        ->and($json['profit_monthly'])->not->toBeEmpty()
        ->and((float) collect($json['profit_monthly'])->sum('monthly'))->toBe(278500.0);
});

it('converts USD profit_amount to PKR when profit_amount_pkr is missing', function () {
    Wallet::query()->create([
        'user_id' => $this->investorA->id,
        'currency' => 'PKR',
        'available_balance' => 0,
        'pending_balance' => 0,
    ]);

    $project = InvestmentProject::query()->create([
        'title' => 'Legacy Settlement',
        'type' => 'container',
        'status' => 'completed',
        'target_amount' => 50000,
        'raised_amount' => 80,
        'investors_count' => 1,
        'expected_return_pct' => 10,
        'min_investment' => 10,
    ]);

    $investment = Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorA->id,
        'amount' => 80,
        'status' => 'completed',
        'profit_amount' => 8,
        'invested_at' => now()->subDays(40),
        'approved_at' => now()->subDays(40),
    ]);

    InvestmentProfitDistribution::query()->create([
        'investment_id' => $investment->id,
        'project_id' => $project->id,
        'investor_id' => $this->investorA->id,
        'project_type' => 'container',
        'invested_amount' => 80,
        'profit_amount' => 8,
        'profit_amount_pkr' => null,
        'total_return' => 88,
        'roi_pct' => 10,
        'distributed_at' => now(),
    ]);

    $this->actingAs($this->investorA)
        ->getJson('/api/investor/dashboard')
        ->assertOk()
        ->assertJsonPath('data.summary.total_profit_earned', 2228) // 8 * 278.5
        ->assertJsonPath('data.summary.total_profit_earned_usd', 8)
        ->assertJsonPath('data.summary.monthly_profit', 2228)
        ->assertJsonPath('data.summary.monthly_profit_usd', 8);
});

it('builds portfolio series from created_at when invested_at is null', function () {
    // Production schema marks invested_at NOT NULL; relax for this edge-case assertion.
    \Illuminate\Support\Facades\Schema::table('investments', function (\Illuminate\Database\Schema\Blueprint $table) {
        $table->timestamp('invested_at')->nullable()->change();
    });

    Wallet::query()->create([
        'user_id' => $this->investorA->id,
        'currency' => 'PKR',
        'available_balance' => 0,
        'pending_balance' => 0,
    ]);

    $project = InvestmentProject::query()->create([
        'title' => 'Fallback Date Container',
        'type' => 'container',
        'status' => 'active',
        'target_amount' => 50000,
        'raised_amount' => 3000,
        'investors_count' => 1,
        'expected_return_pct' => 10,
        'min_investment' => 1000,
        'investment_period_days' => 60,
    ]);

    $investment = Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorA->id,
        'amount' => 3000,
        'amount_pkr' => 835500,
        'exchange_rate' => 278.5,
        'status' => 'active',
        'invested_at' => null,
    ]);
    // Ensure created_at is in the past so densified series has a clear invest day.
    $investment->forceFill(['created_at' => now()->subDays(5)])->saveQuietly();

    $response = $this->actingAs($this->investorA)
        ->getJson('/api/investor/dashboard')
        ->assertOk()
        ->assertJsonPath('data.summary.total_investment', 835500);

    $points = collect($response->json('data.portfolio_series.points'));

    expect($points)->not->toBeEmpty()
        ->and((float) $points->first()['value'])->toBe(0.0)
        ->and((float) $points->max('value'))->toBe(835500.0)
        ->and($points->count())->toBeGreaterThan(1);
});

it('includes a zero baseline and steps up to invested amount on portfolio series', function () {
    Wallet::query()->create([
        'user_id' => $this->investorA->id,
        'currency' => 'PKR',
        'available_balance' => 1000,
        'pending_balance' => 0,
    ]);

    $project = InvestmentProject::query()->create([
        'title' => 'Baseline Chart Project',
        'type' => 'container',
        'status' => 'active',
        'target_amount' => 100000,
        'raised_amount' => 3000,
        'investors_count' => 1,
        'expected_return_pct' => 12,
        'min_investment' => 1000,
        'investment_period_days' => 45,
    ]);

    Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorA->id,
        'amount' => 3000,
        'amount_pkr' => 835500,
        'exchange_rate' => 278.5,
        'status' => 'active',
        'invested_at' => now()->subDays(3),
    ]);

    $response = $this->actingAs($this->investorA)
        ->getJson('/api/investor/dashboard')
        ->assertOk();

    $points = collect($response->json('data.portfolio_series.points'));
    $investDay = now()->subDays(3)->toDateString();

    expect($points)->not->toBeEmpty()
        ->and((float) $points->first()['value'])->toBe(0.0)
        ->and((float) $points->first()['profit'])->toBe(0.0)
        ->and((float) $points->firstWhere('date', $investDay)['value'])->toBe(835500.0)
        ->and((float) $points->last()['value'])->toBe(835500.0)
        ->and($points->pluck('date')->unique()->count())->toBe($points->count());
});

it('sums pending and approved withdrawal amounts and counts for a USD investor', function () {
    Wallet::query()->create([
        'user_id' => $this->investorB->id,
        'currency' => 'USD',
        'available_balance' => 5000,
        'pending_balance' => 0,
    ]);

    Withdrawal::query()->create([
        'investor_id' => $this->investorB->id,
        'amount' => 100,
        'bank_details' => ['bank_name' => 'ENBD', 'account_number' => '1111'],
        'reference' => 'WD-USD-PEND-1',
        'status' => 'pending',
    ]);
    Withdrawal::query()->create([
        'investor_id' => $this->investorB->id,
        'amount' => 50,
        'bank_details' => ['bank_name' => 'ENBD', 'account_number' => '1111'],
        'reference' => 'WD-USD-APPR-1',
        'status' => 'approved',
    ]);
    Deposit::query()->create([
        'investor_id' => $this->investorB->id,
        'amount' => 1000,
        'currency' => 'USD',
        'method' => 'Bank Transfer',
        'reference' => 'DEP-USD-APPR-1',
        'status' => 'approved',
    ]);
    Deposit::query()->create([
        'investor_id' => $this->investorB->id,
        'amount' => 250,
        'currency' => 'USD',
        'method' => 'Bank Transfer',
        'reference' => 'DEP-USD-PEND-1',
        'status' => 'pending',
    ]);

    $this->actingAs($this->investorB)
        ->getJson('/api/investor/dashboard')
        ->assertOk()
        ->assertJsonPath('data.summary.pending_withdrawals_amount', 100)
        ->assertJsonPath('data.summary.pending_withdrawals_count', 1)
        ->assertJsonPath('data.summary.pending_withdrawals_amount_usd', 100)
        ->assertJsonPath('data.summary.total_withdrawals', 50)
        ->assertJsonPath('data.summary.total_withdrawals_count', 1)
        ->assertJsonPath('data.summary.total_withdrawals_usd', 50)
        ->assertJsonPath('data.summary.pending_deposits_amount', 250)
        ->assertJsonPath('data.summary.pending_deposits_count', 1)
        ->assertJsonPath('data.summary.total_deposits', 1000)
        ->assertJsonPath('data.summary.total_deposits_count', 1);
});

it('sums multiple pending withdrawals for the logged in investor', function () {
    Wallet::query()->create([
        'user_id' => $this->investorB->id,
        'currency' => 'USD',
        'available_balance' => 10000,
        'pending_balance' => 0,
    ]);

    Withdrawal::query()->create([
        'investor_id' => $this->investorB->id,
        'amount' => 100,
        'bank_details' => ['bank_name' => 'ENBD'],
        'reference' => 'WD-MULTI-1',
        'status' => 'pending',
    ]);
    Withdrawal::query()->create([
        'investor_id' => $this->investorB->id,
        'amount' => 200,
        'bank_details' => ['bank_name' => 'ENBD'],
        'reference' => 'WD-MULTI-2',
        'status' => 'review',
    ]);
    // Other investor — must not leak into totals
    Withdrawal::query()->create([
        'investor_id' => $this->investorA->id,
        'amount' => 9999,
        'bank_details' => ['bank_name' => 'HBL'],
        'reference' => 'WD-OTHER',
        'status' => 'pending',
    ]);

    $this->actingAs($this->investorB)
        ->getJson('/api/investor/dashboard')
        ->assertOk()
        ->assertJsonPath('data.summary.pending_withdrawals_amount', 300)
        ->assertJsonPath('data.summary.pending_withdrawals_count', 2)
        ->assertJsonPath('data.summary.pending_withdrawals_amount_usd', 300);
});

it('uses stored amount_usd for pending withdrawal usd totals on pkr investors', function () {
    Wallet::query()->create([
        'user_id' => $this->investorA->id,
        'currency' => 'PKR',
        'available_balance' => 500000,
        'pending_balance' => 0,
    ]);

    Withdrawal::query()->create([
        'investor_id' => $this->investorA->id,
        'amount' => 27850,
        'amount_usd' => 100,
        'exchange_rate' => 278.5,
        'bank_details' => ['bank_name' => 'HBL', 'currency' => 'PKR'],
        'reference' => 'WD-PKR-USD-1',
        'status' => 'pending',
    ]);
    Withdrawal::query()->create([
        'investor_id' => $this->investorA->id,
        'amount' => 55700,
        'amount_usd' => 200,
        'exchange_rate' => 278.5,
        'bank_details' => ['bank_name' => 'HBL', 'currency' => 'PKR'],
        'reference' => 'WD-PKR-USD-2',
        'status' => 'pending',
    ]);

    $this->actingAs($this->investorA)
        ->getJson('/api/investor/dashboard')
        ->assertOk()
        ->assertJsonPath('data.summary.pending_withdrawals_amount', 83550)
        ->assertJsonPath('data.summary.pending_withdrawals_count', 2)
        ->assertJsonPath('data.summary.pending_withdrawals_amount_usd', 300);
});

it('returns authoritative PKR portfolio and distribution totals without counting forecasts as pending', function () {
    $wallet = Wallet::query()->create([
        'user_id' => $this->investorA->id,
        'currency' => 'PKR',
        'available_balance' => 1000,
        'pending_balance' => 250,
    ]);
    $project = InvestmentProject::query()->create([
        'title' => 'Portfolio totals project',
        'type' => 'container',
        'status' => 'active',
        'target_amount' => 100000,
        'raised_amount' => 1000,
        'investors_count' => 1,
        'expected_return_pct' => 10,
        'min_investment' => 100,
        'investment_period_days' => 30,
    ]);
    $activeInvestment = Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorA->id,
        'amount' => 100,
        'amount_pkr' => 27850,
        'status' => 'active',
        'invested_at' => now()->subDays(5),
    ]);
    $completedInvestment = Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorA->id,
        'amount' => 500,
        'amount_pkr' => 139250,
        'status' => 'completed',
        'invested_at' => now()->subDays(40),
    ]);
    InvestmentProfitDistribution::query()->create([
        'investment_id' => $completedInvestment->id,
        'project_id' => $project->id,
        'investor_id' => $this->investorA->id,
        'project_type' => 'container',
        'invested_amount' => 500,
        'invested_amount_pkr' => 139250,
        'profit_amount' => 20,
        'profit_amount_pkr' => 5570,
        'total_return' => 520,
        'roi_pct' => 4,
        'distributed_at' => now()->subDay(),
    ]);

    WalletTransaction::query()->create([
        'wallet_id' => $wallet->id,
        'type' => 'distribution',
        'amount' => 120,
        'direction' => 'credit',
        'status' => 'pending',
    ]);
    WalletTransaction::query()->create([
        'wallet_id' => $wallet->id,
        'type' => 'investment_return',
        'amount' => 999999,
        'direction' => 'credit',
        'status' => 'pending',
    ]);
    WalletTransaction::query()->create([
        'wallet_id' => $wallet->id,
        'type' => 'profit',
        'amount' => 999,
        'direction' => 'debit',
        'status' => 'pending',
    ]);
    WalletTransaction::query()->create([
        'wallet_id' => $wallet->id,
        'type' => 'dividend',
        'amount' => 888,
        'direction' => 'credit',
        'status' => 'completed',
    ]);

    $this->actingAs($this->investorA)
        ->getJson('/api/investor/dashboard')
        ->assertOk()
        ->assertJsonPath('data.summary.total_portfolio_value', 29220)
        ->assertJsonPath('data.summary.distributed_returns', 5570)
        ->assertJsonPath('data.summary.pending_distribution', 120)
        ->assertJsonPath('data.summary.display_currency', 'PKR')
        ->assertJsonPath('data.next_distribution_available', true);
});

it('does not use a projected next payout as a pending distribution', function () {
    $wallet = Wallet::query()->create([
        'user_id' => $this->investorB->id,
        'currency' => 'USD',
        'available_balance' => 125,
        'pending_balance' => 25,
    ]);
    $project = InvestmentProject::query()->create([
        'title' => 'Forecast-only project',
        'type' => 'container',
        'status' => 'active',
        'target_amount' => 100000,
        'raised_amount' => 100,
        'investors_count' => 1,
        'expected_return_pct' => 10,
        'min_investment' => 100,
        'investment_period_days' => 30,
    ]);
    Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorB->id,
        'amount' => 100,
        'status' => 'active',
        'invested_at' => now()->subDays(5),
    ]);
    $completedInvestment = Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorB->id,
        'amount' => 100,
        'status' => 'completed',
        'invested_at' => now()->subDays(40),
    ]);
    InvestmentProfitDistribution::query()->create([
        'investment_id' => $completedInvestment->id,
        'project_id' => $project->id,
        'investor_id' => $this->investorB->id,
        'project_type' => 'container',
        'invested_amount' => 100,
        'profit_amount' => 12,
        'total_return' => 112,
        'roi_pct' => 12,
        'distributed_at' => now()->subDay(),
    ]);

    $this->actingAs($this->investorB)
        ->getJson('/api/investor/dashboard')
        ->assertOk()
        ->assertJsonPath('data.summary.total_portfolio_value', 250)
        ->assertJsonPath('data.summary.distributed_returns', 12)
        ->assertJsonPath('data.summary.pending_distribution', 0)
        ->assertJsonPath('data.summary.display_currency', 'USD')
        ->assertJsonPath('data.next_distribution_available', true);
});
