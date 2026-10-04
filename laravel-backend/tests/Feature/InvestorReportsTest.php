<?php

use App\Models\Investment;
use App\Models\InvestmentProfitDistribution;
use App\Models\InvestmentProject;
use App\Models\InvestorReport;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Support\ExchangeRateService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

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

    PlatformSetting::query()->create([
        'site_name' => 'OG Exports',
        'registration_open' => true,
        'investment_open' => true,
        'supplier_module_enabled' => true,
        'investment_module_enabled' => true,
        'invest_pkr_display_enabled' => true,
        'invest_dual_currency_enabled' => true,
        'currency' => 'USD',
    ]);

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
        'company_name' => 'Beta Ventures',
    ]);
});

it('returns zeroed reports payload for investor with no investments', function () {
    $response = $this->actingAs($this->investorA)
        ->getJson('/api/investor/reports')
        ->assertOk()
        ->assertJsonPath('data.has_investments', false)
        ->assertJsonPath('data.summary.total_invested', 0)
        ->assertJsonPath('data.summary.total_profit_earned', 0)
        ->assertJsonPath('data.summary.lifetime_roi', 0)
        ->assertJsonPath('data.summary.reports_generated', 0);

    expect($response->json('data.monthly_series'))->toBe([])
        ->and($response->json('data.history'))->toBe([]);
});

it('rejects report generation when investor has no investments', function () {
    $this->actingAs($this->investorA)
        ->postJson('/api/investor/reports', [
            'report_type' => 'portfolio',
            'format' => 'PDF',
        ])
        ->assertStatus(422)
        ->assertJsonPath('message', 'You have not invested yet please make new investments to view reports');
});

it('returns scoped summary charts and history for logged in investor', function () {
    $walletA = Wallet::query()->create([
        'user_id' => $this->investorA->id,
        'currency' => 'PKR',
        'available_balance' => 5000,
        'pending_balance' => 0,
    ]);
    Wallet::query()->create([
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

    $investmentA = Investment::query()->create([
        'project_id' => $projectA->id,
        'investor_id' => $this->investorA->id,
        'amount' => 10000,
        'amount_pkr' => 2785000,
        'exchange_rate' => 278.5,
        'status' => 'active',
        'invested_at' => now()->subMonths(2),
    ]);
    Investment::query()->create([
        'project_id' => $projectB->id,
        'investor_id' => $this->investorB->id,
        'amount' => 50000,
        'status' => 'active',
        'invested_at' => now()->subDays(5),
    ]);

    InvestmentProfitDistribution::query()->create([
        'investment_id' => $investmentA->id,
        'project_id' => $projectA->id,
        'investor_id' => $this->investorA->id,
        'project_type' => 'container',
        'invested_amount' => 10000,
        'invested_amount_pkr' => 2785000,
        'profit_amount' => 800,
        'profit_amount_pkr' => 222800,
        'total_return' => 10800,
        'roi_pct' => 8,
        'distributed_at' => now()->subMonth(),
    ]);

    WalletTransaction::query()->create([
        'wallet_id' => $walletA->id,
        'type' => 'profit',
        'amount' => 55700,
        'direction' => 'credit',
        'reference' => 'TXN-A-PROFIT',
        'status' => 'completed',
    ]);

    InvestorReport::query()->create([
        'investor_id' => $this->investorA->id,
        'report_type' => 'portfolio',
        'format' => 'pdf',
        'name' => 'Portfolio Report — Test',
        'file_path' => 'investor-reports/'.$this->investorA->id.'/test.pdf',
        'file_size' => 1024,
        'status' => 'ready',
    ]);
    InvestorReport::query()->create([
        'investor_id' => $this->investorB->id,
        'report_type' => 'profit',
        'format' => 'csv',
        'name' => 'Beta Report',
        'file_path' => 'investor-reports/'.$this->investorB->id.'/beta.csv',
        'file_size' => 512,
        'status' => 'ready',
    ]);

    $response = $this->actingAs($this->investorA)
        ->getJson('/api/investor/reports')
        ->assertOk()
        ->assertJsonPath('data.has_investments', true)
        ->assertJsonPath('data.summary.total_invested', 2785000)
        ->assertJsonPath('data.summary.total_profit_earned', 278500)
        ->assertJsonPath('data.summary.total_profit_earned_usd', 1000)
        ->assertJsonPath('data.summary.lifetime_roi', 10)
        ->assertJsonPath('data.summary.reports_generated', 1);

    $series = $response->json('data.monthly_series');
    expect($series)->not->toBeEmpty()
        ->and((float) $series[array_key_last($series)]['investment'])->toBe(2785000.0)
        ->and((float) $series[array_key_last($series)]['profit'])->toBe(278500.0)
        ->and((float) $series[array_key_last($series)]['roi'])->toBe(10.0);

    $history = $response->json('data.history');
    expect($history)->toHaveCount(1)
        ->and($history[0]['name'])->toBe('Portfolio Report — Test')
        ->and($history[0]['type'])->toBe('PDF');
});

it('generates and downloads a report for the current investor only', function () {
    Storage::fake('local');

    Wallet::query()->create([
        'user_id' => $this->investorA->id,
        'currency' => 'PKR',
        'available_balance' => 5000,
        'pending_balance' => 0,
    ]);

    $project = InvestmentProject::query()->create([
        'title' => 'Rice Container',
        'type' => 'container',
        'status' => 'active',
        'target_amount' => 50000,
        'raised_amount' => 5000,
        'investors_count' => 1,
        'expected_return_pct' => 12,
        'min_investment' => 1000,
    ]);

    Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorA->id,
        'amount' => 5000,
        'status' => 'active',
        'invested_at' => now()->subDays(3),
        'reference' => 'INV-A-1',
    ]);

    $create = $this->actingAs($this->investorA)
        ->postJson('/api/investor/reports', [
            'report_type' => 'portfolio',
            'format' => 'CSV',
        ])
        ->assertCreated();

    $reportId = $create->json('data.report.id');
    $downloadUrl = $create->json('data.download_url');

    expect($reportId)->toBeInt()
        ->and($downloadUrl)->toBe('/api/investor/reports/'.$reportId.'/download');

    $report = InvestorReport::query()->findOrFail($reportId);
    expect($report->investor_id)->toBe($this->investorA->id)
        ->and($report->status)->toBe('ready')
        ->and(Storage::disk('local')->exists($report->file_path))->toBeTrue();

    $this->actingAs($this->investorA)
        ->get($downloadUrl)
        ->assertOk()
        ->assertHeader('content-disposition');

    $this->actingAs($this->investorB)
        ->getJson('/api/investor/reports/'.$reportId.'/download')
        ->assertNotFound();
});

it('formats PKR wallet investor report amounts as PKR with USD in brackets', function () {
    Storage::fake('local');

    Wallet::query()->create([
        'user_id' => $this->investorA->id,
        'currency' => 'PKR',
        'available_balance' => 500000,
        'pending_balance' => 0,
    ]);

    $project = InvestmentProject::query()->create([
        'title' => 'PKR Dual Container',
        'type' => 'container',
        'status' => 'active',
        'target_amount' => 50000,
        'raised_amount' => 2000,
        'investors_count' => 1,
        'expected_return_pct' => 10,
        'min_investment' => 100,
    ]);

    Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorA->id,
        'amount' => 2000,
        'amount_pkr' => 557000,
        'exchange_rate' => 278.5,
        'status' => 'active',
        'invested_at' => now()->subDays(2),
        'reference' => 'INV-PKR-DUAL',
    ]);

    $create = $this->actingAs($this->investorA)
        ->postJson('/api/investor/reports', [
            'report_type' => 'portfolio',
            'format' => 'CSV',
        ])
        ->assertCreated();

    $report = InvestorReport::query()->findOrFail($create->json('data.report.id'));
    $csv = Storage::disk('local')->get($report->file_path);

    expect($csv)->toContain('PKR')
        ->and($csv)->toContain('($2,000.00)')
        ->and($csv)->toContain('INV-PKR-DUAL')
        ->and($csv)->toContain('PKR 557,000.00');
});

it('formats PKR wallet investor report amounts as USD only when PKR display is disabled', function () {
    Storage::fake('local');

    PlatformSetting::query()->update(['invest_pkr_display_enabled' => false]);

    Wallet::query()->create([
        'user_id' => $this->investorA->id,
        'currency' => 'PKR',
        'available_balance' => 500000,
        'pending_balance' => 0,
    ]);

    $project = InvestmentProject::query()->create([
        'title' => 'PKR USD Only Container',
        'type' => 'container',
        'status' => 'active',
        'target_amount' => 50000,
        'raised_amount' => 2000,
        'investors_count' => 1,
        'expected_return_pct' => 10,
        'min_investment' => 100,
    ]);

    Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investorA->id,
        'amount' => 2000,
        'amount_pkr' => 557000,
        'exchange_rate' => 278.5,
        'status' => 'active',
        'invested_at' => now()->subDays(2),
        'reference' => 'INV-PKR-USD-ONLY',
    ]);

    $create = $this->actingAs($this->investorA)
        ->postJson('/api/investor/reports', [
            'report_type' => 'portfolio',
            'format' => 'CSV',
        ])
        ->assertCreated();

    $report = InvestorReport::query()->findOrFail($create->json('data.report.id'));
    $csv = Storage::disk('local')->get($report->file_path);

    expect($csv)->toContain('$2,000.00')
        ->and($csv)->toContain('INV-PKR-USD-ONLY')
        ->and($csv)->not->toContain('PKR 557,000.00');
});
