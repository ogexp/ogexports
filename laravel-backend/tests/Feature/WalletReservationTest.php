<?php

use App\Models\Investment;
use App\Models\InvestmentProject;
use App\Models\InvestorBankAccountVerification;
use App\Models\KycApplication;
use App\Models\PlatformSetting;
use App\Models\PlatformWallet;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Support\InvestmentReviewService;
use App\Support\InvestorBankAccountPresenter;
use App\Support\PlatformWalletService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

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

    PlatformWalletService::ensure('USD');

    $this->admin = User::factory()->create(['account_status' => 'active']);
    $this->admin->assignRole('admin');

    $this->investor = User::factory()->create(['account_status' => 'active']);
    $this->investor->assignRole('investor');
    $verifiedBank = [
        'id' => 'verified-withdrawal-account',
        'bank_name' => 'Test Bank',
        'account_holder' => 'Jane Investor',
        'account_number' => '1234567890',
        'currency' => 'USD',
        'is_default' => true,
    ];
    UserProfile::query()->create([
        'user_id' => $this->investor->id,
        'country' => 'United States',
        'meta' => ['bank_accounts' => [$verifiedBank]],
    ]);
    InvestorBankAccountVerification::query()->create([
        'investor_id' => $this->investor->id,
        'bank_account_id' => $verifiedBank['id'],
        'account_fingerprint' => InvestorBankAccountPresenter::fingerprint($verifiedBank),
        'document_path' => 'test/verified-bank-proof.pdf',
        'original_name' => 'verified-bank-proof.pdf',
        'status' => 'verified',
        'reviewed_at' => now(),
    ]);

    KycApplication::query()->create([
        'user_id' => $this->investor->id,
        'type' => 'individual',
        'country' => 'Pakistan',
        'status' => 'approved',
        'submitted_at' => now(),
        'reviewed_at' => now(),
    ]);

    $this->project = InvestmentProject::query()->create([
        'title' => 'Capacity Test Project',
        'type' => 'container',
        'status' => 'funding',
        'target_amount' => 10000,
        'raised_amount' => 0,
        'investors_count' => 0,
        'min_investment' => 100,
        'expected_return_pct' => 8,
    ]);

    Wallet::query()->create([
        'user_id' => $this->investor->id,
        'currency' => 'USD',
        'available_balance' => 10000,
        'pending_balance' => 0,
    ]);
});

it('auto-approves wallet investment and credits platform wallet', function () {
    $this->actingAs($this->investor)
        ->postJson("/api/investor/projects/{$this->project->id}/invest", ['amount' => 1500])
        ->assertCreated();

    $investment = Investment::query()->where('investor_id', $this->investor->id)->first();
    expect($investment)->not->toBeNull()
        ->and($investment->status)->toBe('active')
        ->and($investment->approved_at)->not->toBeNull();

    $wallet = Wallet::query()->where('user_id', $this->investor->id)->first();
    expect((float) $wallet->available_balance)->toBe(8500.0)
        ->and((float) $wallet->pending_balance)->toBe(0.0);

    $platformWallet = PlatformWallet::query()->where('currency', 'USD')->first();
    expect((float) $platformWallet->balance)->toBe(1500.0);

    $txn = WalletTransaction::query()->where('type', 'investment')->latest('id')->first();
    expect($txn->status)->toBe('completed')
        ->and((float) $txn->amount)->toBe(1500.0);

    $this->project->refresh();
    expect((float) $this->project->raised_amount)->toBe(1500.0);
});

it('allows investing the full available wallet balance with auto-approval', function () {
    $this->actingAs($this->investor)
        ->postJson("/api/investor/projects/{$this->project->id}/invest", ['amount' => 10000])
        ->assertCreated();

    $wallet = Wallet::query()->where('user_id', $this->investor->id)->first();
    expect((float) $wallet->available_balance)->toBe(0.0)
        ->and((float) $wallet->pending_balance)->toBe(0.0);

    $investment = Investment::query()->where('investor_id', $this->investor->id)->first();
    expect($investment->status)->toBe('active');
});

it('prevents a second investment when available balance is insufficient after auto-approved invest', function () {
    $this->actingAs($this->investor)
        ->postJson("/api/investor/projects/{$this->project->id}/invest", ['amount' => 7000])
        ->assertCreated();

    $this->actingAs($this->investor)
        ->postJson("/api/investor/projects/{$this->project->id}/invest", ['amount' => 4000])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['amount']);

    expect(Investment::query()->where('investor_id', $this->investor->id)->count())->toBe(1);

    $wallet = Wallet::query()->where('user_id', $this->investor->id)->first();
    expect((float) $wallet->available_balance)->toBe(3000.0)
        ->and((float) $wallet->pending_balance)->toBe(0.0);
});

it('blocks investments that exceed remaining project capacity', function () {
    Investment::query()->create([
        'project_id' => $this->project->id,
        'investor_id' => $this->investor->id,
        'amount' => 9000,
        'status' => 'active',
        'reference' => 'INV-ACTIVE-9000',
        'invested_at' => now(),
        'approved_at' => now(),
    ]);

    $this->project->update(['raised_amount' => 9000]);

    $this->actingAs($this->investor)
        ->postJson("/api/investor/projects/{$this->project->id}/invest", ['amount' => 2000])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['amount']);
});

it('blocks admin approval when legacy pending investment exceeds remaining project capacity', function () {
    Investment::query()->create([
        'project_id' => $this->project->id,
        'investor_id' => $this->admin->id,
        'amount' => 9500,
        'status' => 'active',
        'reference' => 'INV-ACTIVE-9500',
        'invested_at' => now(),
        'approved_at' => now(),
    ]);

    $this->project->update(['raised_amount' => 9500]);

    $investment = Investment::query()->create([
        'project_id' => $this->project->id,
        'investor_id' => $this->investor->id,
        'amount' => 1000,
        'status' => 'pending',
        'reference' => 'INV-OVER-CAP',
        'invested_at' => now(),
    ]);

    Wallet::query()->where('user_id', $this->investor->id)->update([
        'available_balance' => 0,
        'pending_balance' => 1000,
    ]);

    WalletTransaction::query()->create([
        'wallet_id' => Wallet::query()->where('user_id', $this->investor->id)->value('id'),
        'type' => 'investment',
        'amount' => 1000,
        'direction' => 'debit',
        'reference' => 'INV-OVER-CAP',
        'status' => 'pending',
        'meta' => ['investment_id' => $investment->id],
    ]);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/project-investments/{$investment->id}/approve")
        ->assertStatus(422);
});

it('completes investment by debiting platform wallet and crediting user with profit', function () {
    $this->actingAs($this->investor)
        ->postJson("/api/investor/projects/{$this->project->id}/invest", ['amount' => 1000])
        ->assertCreated();

    $investment = Investment::query()->where('investor_id', $this->investor->id)->first();
    $platformWallet = PlatformWallet::query()->where('currency', 'USD')->first();
    expect((float) $platformWallet->balance)->toBe(1000.0);

    // Admin profit pool must cover expected ROI payout beyond invested principal.
    PlatformWalletService::credit(80, 'profit_reserve', 'TEST-PROFIT-'.$investment->id);

    app(InvestmentReviewService::class)->complete($investment);

    $investment->refresh();
    expect($investment->status)->toBe('completed')
        ->and((float) $investment->profit_amount)->toBe(80.0);

    $wallet = Wallet::query()->where('user_id', $this->investor->id)->first();
    expect((float) $wallet->available_balance)->toBe(10080.0);

    $platformWallet->refresh();
    expect((float) $platformWallet->balance)->toBe(0.0);
});

it('prevents admin from lowering target below active raised amount', function () {
    Investment::query()->create([
        'project_id' => $this->project->id,
        'investor_id' => $this->investor->id,
        'amount' => 5000,
        'status' => 'active',
        'reference' => 'INV-5000',
        'invested_at' => now(),
        'approved_at' => now(),
    ]);
    $this->project->update(['raised_amount' => 5000]);

    $this->actingAs($this->admin)
        ->putJson("/api/admin/investment-projects/{$this->project->id}", [
            'target_amount' => 3000,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['target_amount']);
});

it('allows admin to increase target amount above active raised', function () {
    Investment::query()->create([
        'project_id' => $this->project->id,
        'investor_id' => $this->investor->id,
        'amount' => 5000,
        'status' => 'active',
        'reference' => 'INV-5000',
        'invested_at' => now(),
        'approved_at' => now(),
    ]);
    $this->project->update(['raised_amount' => 5000]);

    $this->actingAs($this->admin)
        ->putJson("/api/admin/investment-projects/{$this->project->id}", [
            'target_amount' => 15000,
        ])
        ->assertOk();

    $this->project->refresh();
    expect((float) $this->project->target_amount)->toBe(15000.0);
});

it('returns withdrawal fee and processing terms from the investor dashboard', function () {
    $this->actingAs($this->investor)
        ->getJson('/api/investor/dashboard')
        ->assertOk()
        ->assertJsonPath('data.withdrawal_fee', 2)
        ->assertJsonPath('data.withdrawal_fee_usd', 2)
        ->assertJsonPath('data.withdrawal_fee_currency', 'USD')
        ->assertJsonPath('data.minimum_withdrawal_amount', 100)
        ->assertJsonPath('data.minimum_withdrawal_usd', 100)
        ->assertJsonPath('data.minimum_withdrawal_currency', 'USD')
        ->assertJsonPath('data.estimated_processing_time', '1 to 2 working days');

    $this->actingAs($this->investor)
        ->getJson('/api/investor/wallet')
        ->assertOk()
        ->assertJsonPath('data.minimum_withdrawal_amount', 100)
        ->assertJsonPath('data.minimum_withdrawal_usd', 100)
        ->assertJsonPath('data.minimum_withdrawal_currency', 'USD');
});

it('rejects a USD payout below the USD 100 minimum before verifying the withdrawal code', function () {
    $this->investor->forceFill([
        'transaction_password' => bcrypt('123456'),
        'transaction_password_set_at' => now(),
        'withdraw_otp_code' => bcrypt('123456'),
        'withdraw_otp_expires_at' => now()->addMinutes(10),
    ])->save();

    $this->actingAs($this->investor)
        ->postJson('/api/investor/withdrawals', [
            'amount' => 99.99,
            'bank_details' => [
                'bank_name' => 'Test Bank',
                'account_holder' => 'Jane Investor',
                'account_number' => '1234567890',
            ],
            'otp' => '123456',
            'transaction_password' => '123456',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['amount'])
        ->assertJsonPath('errors.amount.0', 'The payout amount must be at least USD 100.00. The withdrawal fee is added separately.');

    $wallet = Wallet::query()->where('user_id', $this->investor->id)->firstOrFail();
    expect((float) $wallet->available_balance)->toBe(10000.0)
        ->and((float) $wallet->pending_balance)->toBe(0.0)
        ->and(\App\Models\Withdrawal::query()->where('investor_id', $this->investor->id)->count())->toBe(0);
});

it('returns platform wallet stats for admin finance endpoint', function () {
    $this->actingAs($this->investor)
        ->postJson("/api/investor/projects/{$this->project->id}/invest", ['amount' => 2000])
        ->assertCreated();

    $this->actingAs($this->admin)
        ->getJson('/api/admin/finance/platform-wallet')
        ->assertOk()
        ->assertJsonPath('data.balance', 2000)
        ->assertJsonPath('data.active_investments_total', 2000);
});

it('reserves the payout and fee on withdrawal request, then clears the full debit on approval', function () {
    $this->investor->forceFill([
        'transaction_password' => bcrypt('123456'),
        'transaction_password_set_at' => now(),
        'withdraw_otp_code' => bcrypt('123456'),
        'withdraw_otp_expires_at' => now()->addMinutes(10),
    ])->save();

    $response = $this->actingAs($this->investor)
        ->postJson('/api/investor/withdrawals', [
            'amount' => 2500,
            'bank_details' => [
                'bank_name' => 'Test Bank',
                'account_holder' => 'Jane Investor',
                'account_number' => '1234567890',
            ],
            'otp' => '123456',
            'transaction_password' => '123456',
        ])
        ->assertCreated()
        ->assertJsonPath('data.amount', 2500)
        ->assertJsonPath('data.fee', 2)
        ->assertJsonPath('data.fee_usd', 2)
        ->assertJsonPath('data.total_debit', 2502)
        ->assertJsonPath('data.total_debit_usd', 2502)
        ->assertJsonPath('data.currency', 'USD')
        ->assertJsonPath('data.estimated_processing_time', '1 to 2 working days');
    $withdrawalId = $response->json('data.id');

    $wallet = Wallet::query()->where('user_id', $this->investor->id)->first();
    expect((float) $wallet->available_balance)->toBe(7498.0)
        ->and((float) $wallet->pending_balance)->toBe(2502.0);

    $transaction = WalletTransaction::query()
        ->where('meta->withdrawal_id', $withdrawalId)
        ->firstOrFail();
    expect((float) $transaction->amount)->toBe(2502.0)
        ->and((float) $transaction->meta['payout_amount'])->toBe(2500.0)
        ->and((float) $transaction->meta['fee'])->toBe(2.0);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/finance/withdrawals/{$withdrawalId}/approve")
        ->assertOk();

    $wallet->refresh();
    $transaction->refresh();
    expect((float) $wallet->available_balance)->toBe(7498.0)
        ->and((float) $wallet->pending_balance)->toBe(0.0)
        ->and($transaction->status)->toBe('completed')
        ->and((float) $transaction->amount)->toBe(2502.0);
});

it('returns the full payout plus fee reservation when a withdrawal is rejected', function () {
    $this->investor->forceFill([
        'transaction_password' => bcrypt('123456'),
        'transaction_password_set_at' => now(),
        'withdraw_otp_code' => bcrypt('123456'),
        'withdraw_otp_expires_at' => now()->addMinutes(10),
    ])->save();

    $response = $this->actingAs($this->investor)
        ->postJson('/api/investor/withdrawals', [
            'amount' => 2500,
            'bank_details' => [
                'bank_name' => 'Test Bank',
                'account_holder' => 'Jane Investor',
                'account_number' => '1234567890',
            ],
            'otp' => '123456',
            'transaction_password' => '123456',
        ])
        ->assertCreated();
    $withdrawalId = $response->json('data.id');

    $this->actingAs($this->admin)
        ->postJson("/api/admin/finance/withdrawals/{$withdrawalId}/reject")
        ->assertOk();

    $wallet = Wallet::query()->where('user_id', $this->investor->id)->first();
    $transaction = WalletTransaction::query()
        ->where('meta->withdrawal_id', $withdrawalId)
        ->firstOrFail();
    expect((float) $wallet->available_balance)->toBe(10000.0)
        ->and((float) $wallet->pending_balance)->toBe(0.0)
        ->and($transaction->status)->toBe('rejected')
        ->and((float) $transaction->amount)->toBe(2502.0);
});

it('rejects a payout that fits the balance only before applying the withdrawal fee', function () {
    $this->investor->forceFill([
        'transaction_password' => bcrypt('123456'),
        'transaction_password_set_at' => now(),
        'withdraw_otp_code' => bcrypt('123456'),
        'withdraw_otp_expires_at' => now()->addMinutes(10),
    ])->save();

    $this->actingAs($this->investor)
        ->postJson('/api/investor/withdrawals', [
            'amount' => 10000,
            'bank_details' => [
                'bank_name' => 'Test Bank',
                'account_holder' => 'Jane Investor',
                'account_number' => '1234567890',
            ],
            'otp' => '123456',
            'transaction_password' => '123456',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['amount']);

    $wallet = Wallet::query()->where('user_id', $this->investor->id)->first();
    expect((float) $wallet->available_balance)->toBe(10000.0)
        ->and((float) $wallet->pending_balance)->toBe(0.0)
        ->and(\App\Models\Withdrawal::query()->where('investor_id', $this->investor->id)->count())->toBe(0);
});
