<?php

use App\Models\Deposit;
use App\Models\Investment;
use App\Models\InvestmentProfitDistribution;
use App\Models\InvestmentProject;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\Withdrawal;
use Database\Seeders\RoleSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

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
    $this->admin = User::factory()->create(['account_status' => 'active']);
    $this->admin->assignRole('admin');

    Http::fake();
    Mail::fake();
});

function assignConvertedFinancialId(Model $record, string $table, int $legacyId): int
{
    $convertedId = 10_000_000 + $legacyId;
    DB::table($table)
        ->where('id', $record->getKey())
        ->update(['id' => $convertedId]);

    return $convertedId;
}

it('resolves legacy deposit and withdrawal IDs for investor detail and admin review', function () {
    $deposit = Deposit::query()->create([
        'investor_id' => $this->investor->id,
        'amount' => 125,
        'currency' => 'USD',
        'method' => 'bank_transfer',
        'reference' => 'LEGACY-DEPOSIT',
        'status' => 'pending',
    ]);
    $depositId = assignConvertedFinancialId($deposit, 'deposits', 123);

    $withdrawal = Withdrawal::query()->create([
        'investor_id' => $this->investor->id,
        'amount' => 75,
        'total_debit' => 75,
        'bank_details' => [],
        'reference' => 'LEGACY-WITHDRAWAL',
        'status' => 'pending',
    ]);
    $withdrawalId = assignConvertedFinancialId($withdrawal, 'withdrawals', 456);

    $this->actingAs($this->investor)
        ->getJson('/api/investor/deposits/123')
        ->assertOk()
        ->assertJsonPath('data.id', $depositId)
        ->assertJsonPath('data.reference', 'LEGACY-DEPOSIT');

    $depositPdf = $this->actingAs($this->investor)
        ->get('/api/investor/deposits/123/pdf')
        ->assertOk();
    expect($depositPdf->headers->get('content-type'))->toContain('application/pdf');

    $this->actingAs($this->investor)
        ->getJson('/api/investor/withdrawals/456')
        ->assertOk()
        ->assertJsonPath('data.id', $withdrawalId)
        ->assertJsonPath('data.reference', 'LEGACY-WITHDRAWAL');

    $withdrawalPdf = $this->actingAs($this->investor)
        ->get('/api/investor/withdrawals/456/pdf')
        ->assertOk();
    expect($withdrawalPdf->headers->get('content-type'))->toContain('application/pdf');
    expect($depositPdf->headers->get('content-disposition'))->toContain('LEGACY-DEPOSIT');
    expect($withdrawalPdf->headers->get('content-disposition'))->toContain('LEGACY-WITHDRAWAL');

    $otherInvestor = User::factory()->create(['account_status' => 'active']);
    $otherInvestor->assignRole('investor');
    foreach ([
        '/api/investor/deposits/123',
        '/api/investor/deposits/123/pdf',
        '/api/investor/withdrawals/456',
        '/api/investor/withdrawals/456/pdf',
    ] as $url) {
        $this->actingAs($otherInvestor)->getJson($url)->assertNotFound();
    }

    $this->actingAs($this->admin)
        ->postJson('/api/admin/finance/deposits/123/reject')
        ->assertOk()
        ->assertJsonPath('data.id', $depositId)
        ->assertJsonPath('data.status', 'rejected');

    $this->actingAs($this->admin)
        ->postJson('/api/admin/finance/withdrawals/456/reject')
        ->assertOk()
        ->assertJsonPath('data.id', $withdrawalId)
        ->assertJsonPath('data.status', 'rejected');
});

it('resolves legacy investment and wallet-transaction IDs without weakening investor ownership', function () {
    $project = InvestmentProject::query()->create([
        'title' => 'Legacy ID test project',
        'type' => 'container',
        'status' => 'funding',
        'target_amount' => 10000,
        'raised_amount' => 0,
        'investors_count' => 1,
        'min_investment' => 100,
        'expected_return_pct' => 8,
    ]);

    $investment = Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $this->investor->id,
        'amount' => 250,
        'status' => 'active',
        'reference' => 'LEGACY-INVESTMENT',
        'invested_at' => now(),
        'approved_at' => now(),
    ]);
    $investmentId = assignConvertedFinancialId($investment, 'investments', 789);

    $wallet = Wallet::query()->create([
        'user_id' => $this->investor->id,
        'currency' => 'USD',
        'available_balance' => 0,
        'pending_balance' => 0,
    ]);
    $transaction = $wallet->transactions()->create([
        'type' => 'deposit',
        'amount' => 250,
        'direction' => 'credit',
        'reference' => 'LEGACY-WALLET-TXN',
        'status' => 'completed',
    ]);
    $transactionId = assignConvertedFinancialId($transaction, 'wallet_transactions', 987);

    $this->actingAs($this->investor)
        ->getJson('/api/investor/investments/789')
        ->assertOk()
        ->assertJsonPath('data.id', $investmentId)
        ->assertJsonPath('data.reference', 'LEGACY-INVESTMENT');

    $investmentPdf = $this->actingAs($this->investor)
        ->get('/api/investor/investments/789/pdf')
        ->assertOk();
    expect($investmentPdf->headers->get('content-type'))->toContain('application/pdf');
    expect($investmentPdf->headers->get('content-disposition'))->toContain('LEGACY-INVESTMENT');

    $investmentExport = $this->actingAs($this->investor)
        ->get('/api/investor/investments/789/export')
        ->assertOk();
    expect($investmentExport->streamedContent())->toContain('LEGACY-INVESTMENT');
    expect($investmentExport->headers->get('content-disposition'))->toContain('LEGACY-INVESTMENT');

    $this->actingAs($this->investor)
        ->getJson('/api/investor/wallet/transactions/987')
        ->assertOk()
        ->assertJsonPath('data.id', $transactionId)
        ->assertJsonPath('data.reference', 'LEGACY-WALLET-TXN');

    $transactionPdf = $this->actingAs($this->investor)
        ->get('/api/investor/wallet/transactions/987/pdf')
        ->assertOk();
    expect($transactionPdf->headers->get('content-type'))->toContain('application/pdf');
    expect($transactionPdf->headers->get('content-disposition'))->toContain('LEGACY-WALLET-TXN');

    $this->actingAs($this->admin)
        ->getJson('/api/admin/project-investments/789')
        ->assertOk()
        ->assertJsonPath('data.id', $investmentId);

    $this->actingAs($this->admin)
        ->patchJson('/api/admin/investment-payout-progress/789', [
            'status' => 'scheduled',
            'planned_distribution_date' => now()->addDays(5)->toDateString(),
        ])
        ->assertOk()
        ->assertJsonPath('data.investment_id', $investmentId);

    InvestmentProfitDistribution::query()->create([
        'investment_id' => $investmentId,
        'project_id' => $project->id,
        'investor_id' => $this->investor->id,
        'project_type' => 'container',
        'invested_amount' => 250,
        'profit_amount' => 20,
        'total_return' => 270,
        'roi_pct' => 8,
        'distributed_at' => now(),
    ]);

    $this->actingAs($this->admin)
        ->getJson('/api/admin/investment-profit-distributions?investment_id=789')
        ->assertOk()
        ->assertJsonPath('data.0.investment_id', $investmentId);

    $otherInvestor = User::factory()->create(['account_status' => 'active']);
    $otherInvestor->assignRole('investor');
    foreach ([
        '/api/investor/investments/789',
        '/api/investor/investments/789/pdf',
        '/api/investor/investments/789/export',
        '/api/investor/wallet/transactions/987',
        '/api/investor/wallet/transactions/987/pdf',
    ] as $url) {
        $this->actingAs($otherInvestor)
            ->get($url)
            ->assertNotFound();
    }
});

it('keeps current eight-digit IDs exact and does not resolve missing legacy IDs', function () {
    $deposit = Deposit::query()->create([
        'investor_id' => $this->investor->id,
        'amount' => 125,
        'currency' => 'USD',
        'method' => 'bank_transfer',
        'reference' => 'CURRENT-DEPOSIT',
        'status' => 'pending',
    ]);
    $depositId = assignConvertedFinancialId($deposit, 'deposits', 321);

    $this->actingAs($this->investor)
        ->getJson("/api/investor/deposits/{$depositId}")
        ->assertOk()
        ->assertJsonPath('data.id', $depositId)
        ->assertJsonPath('data.reference', 'CURRENT-DEPOSIT');

    $this->actingAs($this->investor)
        ->getJson('/api/investor/deposits/654')
        ->assertNotFound();
});

it('filters admin finance lists by exact current and legacy transaction IDs within each record type', function () {
    $deposit = Deposit::query()->create([
        'investor_id' => $this->investor->id,
        'amount' => 125,
        'currency' => 'USD',
        'method' => 'bank_transfer',
        'reference' => 'SEARCH-DEPOSIT',
        'status' => 'pending',
    ]);
    $depositId = assignConvertedFinancialId($deposit, 'deposits', 123);

    $withdrawal = Withdrawal::query()->create([
        'investor_id' => $this->investor->id,
        'amount' => 75,
        'bank_details' => ['bank_name' => 'Test Bank'],
        'reference' => 'SEARCH-WITHDRAWAL',
        'status' => 'pending',
    ]);
    $withdrawalId = assignConvertedFinancialId($withdrawal, 'withdrawals', 456);

    $wallet = Wallet::query()->create([
        'user_id' => $this->investor->id,
        'currency' => 'USD',
        'available_balance' => 0,
        'pending_balance' => 0,
    ]);
    $transaction = WalletTransaction::query()->create([
        'wallet_id' => $wallet->id,
        'type' => 'profit',
        'amount' => 40,
        'direction' => 'credit',
        'reference' => 'SEARCH-WALLET-TXN',
        'status' => 'completed',
    ]);
    $transactionId = assignConvertedFinancialId($transaction, 'wallet_transactions', 789);

    $this->actingAs($this->admin)
        ->getJson('/api/admin/finance/deposits?transaction_id=123')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $depositId);
    $this->actingAs($this->admin)
        ->getJson("/api/admin/finance/deposits?transaction_id={$depositId}")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $depositId);
    $this->actingAs($this->admin)
        ->getJson('/api/admin/finance/deposits?transaction_id=456')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    $this->actingAs($this->admin)
        ->getJson('/api/admin/finance/withdrawals?transaction_id=456')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $withdrawalId);
    $this->actingAs($this->admin)
        ->getJson('/api/admin/finance/withdrawals?transaction_id=123')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    $this->actingAs($this->admin)
        ->getJson('/api/admin/finance/transactions?transaction_id=789')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $transactionId);
    $this->actingAs($this->admin)
        ->getJson('/api/admin/finance/transactions?transaction_id=123')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    foreach ([
        '/api/admin/finance/deposits?transaction_id=invalid',
        '/api/admin/finance/withdrawals?transaction_id=invalid',
        '/api/admin/finance/transactions?transaction_id=invalid',
    ] as $url) {
        $this->actingAs($this->admin)
            ->getJson($url)
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }
});
