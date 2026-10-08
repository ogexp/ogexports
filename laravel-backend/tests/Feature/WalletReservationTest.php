<?php

use App\Models\Investment;
use App\Models\AppNotification;
use App\Models\InvestmentProject;
use App\Models\Deposit;
use App\Models\InvestorBankAccountVerification;
use App\Models\KycApplication;
use App\Models\PlatformSetting;
use App\Models\PlatformWallet;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\Withdrawal;
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

it('filters and paginates withdrawal history by reference, status, and date', function () {
    $today = now()->startOfDay();
    $makeWithdrawal = function (int $investorId, string $reference, string $status, \Illuminate\Support\Carbon $createdAt) {
        $withdrawal = Withdrawal::query()->create([
            'investor_id' => $investorId,
            'amount' => 250000,
            'amount_usd' => 806.45,
            'exchange_rate' => 310,
            'fee' => 2500,
            'fee_usd' => 8.06,
            'total_debit' => 252500,
            'total_debit_usd' => 814.52,
            'bank_details' => ['currency' => 'PKR'],
            'reference' => $reference,
            'status' => $status,
        ]);
        $withdrawal->forceFill(['created_at' => $createdAt])->save();

        return $withdrawal;
    };

    $olderMatch = $makeWithdrawal(
        $this->investor->id,
        'OGWITH-SEARCH-APR-A',
        'approved',
        $today->copy()->subDays(8)->setTime(12, 0),
    );
    $newerMatch = $makeWithdrawal(
        $this->investor->id,
        'OGWITH-SEARCH-APR-B',
        'approved',
        $today->copy()->subDays(4)->setTime(12, 0),
    );
    $makeWithdrawal(
        $this->investor->id,
        'OGWITH-OTHER-APR',
        'rejected',
        $today->copy()->subDays(5)->setTime(12, 0),
    );
    $makeWithdrawal(
        $this->investor->id,
        'OGWITH-SEARCH-OLD',
        'approved',
        $today->copy()->subDays(12)->setTime(12, 0),
    );
    $makeWithdrawal(
        $this->admin->id,
        'OGWITH-SEARCH-APR-OTHER-USER',
        'approved',
        $today->copy()->subDays(3)->setTime(12, 0),
    );

    $params = [
        'reference' => 'ogwith-search-apr',
        'status' => 'APPROVED',
        'date_from' => $today->copy()->subDays(10)->toDateString(),
        'date_to' => $today->copy()->subDays(2)->toDateString(),
        'per_page' => 1,
    ];

    $this->actingAs($this->investor)
        ->getJson('/api/investor/withdrawals?'.http_build_query($params))
        ->assertOk()
        ->assertJsonPath('current_page', 1)
        ->assertJsonPath('last_page', 2)
        ->assertJsonPath('per_page', 1)
        ->assertJsonPath('total', 2)
        ->assertJsonPath('data.0.id', $newerMatch->id)
        ->assertJsonPath('data.0.amount', 250000)
        ->assertJsonPath('data.0.amount_usd', 806.45)
        ->assertJsonPath('data.0.exchange_rate', 310)
        ->assertJsonPath('data.0.fee', 2500)
        ->assertJsonPath('data.0.fee_usd', 8.06)
        ->assertJsonPath('data.0.total_debit', 252500)
        ->assertJsonPath('data.0.total_debit_usd', 814.52)
        ->assertJsonPath('data.0.currency', 'PKR');

    $this->actingAs($this->investor)
        ->getJson('/api/investor/withdrawals?'.http_build_query([...$params, 'page' => 2]))
        ->assertOk()
        ->assertJsonPath('current_page', 2)
        ->assertJsonPath('total', 2)
        ->assertJsonPath('data.0.id', $olderMatch->id)
        ->assertJsonPath('data.0.amount_usd', 806.45)
        ->assertJsonPath('data.0.fee_usd', 8.06)
        ->assertJsonPath('data.0.total_debit_usd', 814.52)
        ->assertJsonPath('data.0.currency', 'PKR');

    $this->actingAs($this->investor)
        ->getJson('/api/investor/withdrawals?'.http_build_query([
            'date_from' => $today->copy()->subDays(2)->toDateString(),
            'date_to' => $today->copy()->subDays(8)->toDateString(),
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['date_to']);
});

it('filters and paginates investor deposit history by partial reference, review status, and inclusive dates', function () {
    $today = now()->startOfDay();
    $makeDeposit = function (int $investorId, string $reference, string $bankReference, string $status, \Illuminate\Support\Carbon $createdAt) {
        $deposit = Deposit::query()->create([
            'investor_id' => $investorId,
            'amount' => 1250.50,
            'currency' => 'EUR',
            'method' => 'bank_transfer',
            'reference' => $reference,
            'bank_reference' => $bankReference,
            'status' => $status,
        ]);
        $deposit->forceFill(['created_at' => $createdAt])->save();

        return $deposit;
    };

    $olderMatch = $makeDeposit(
        $this->investor->id,
        'OGDEP-SEARCH-APR-A',
        'BANK-TRANSFER-OLDER',
        'approved',
        $today->copy()->subDays(8)->setTime(12, 0),
    );
    $newerMatch = $makeDeposit(
        $this->investor->id,
        'OGDEP-SEARCH-APR-B',
        'BANK-TRANSFER-NEWER',
        'approved',
        $today->copy()->subDays(2)->setTime(12, 0),
    );
    $makeDeposit(
        $this->investor->id,
        'OGDEP-OTHER-APR',
        'BANK-TRANSFER-SEARCH',
        'rejected',
        $today->copy()->subDays(5)->setTime(12, 0),
    );
    $makeDeposit(
        $this->investor->id,
        'OGDEP-SEARCH-OLD',
        'BANK-TRANSFER-OLD',
        'approved',
        $today->copy()->subDays(12)->setTime(12, 0),
    );
    $makeDeposit(
        $this->admin->id,
        'OGDEP-SEARCH-APR-OTHER-USER',
        'BANK-TRANSFER-OTHER-USER',
        'approved',
        $today->copy()->subDays(3)->setTime(12, 0),
    );

    $params = [
        'reference' => 'ogdep-search-apr',
        'status' => 'APPROVED',
        'date_from' => $today->copy()->subDays(8)->toDateString(),
        'date_to' => $today->copy()->subDays(2)->toDateString(),
        'per_page' => 1,
    ];

    $this->actingAs($this->investor)
        ->getJson('/api/investor/deposits?'.http_build_query($params))
        ->assertOk()
        ->assertJsonPath('current_page', 1)
        ->assertJsonPath('last_page', 2)
        ->assertJsonPath('per_page', 1)
        ->assertJsonPath('total', 2)
        ->assertJsonPath('data.0.id', $newerMatch->id)
        ->assertJsonPath('data.0.amount', '1250.50')
        ->assertJsonPath('data.0.currency', 'EUR')
        ->assertJsonPath('data.0.review_status', 'approved')
        ->assertJsonPath('data.0.original_amount', 1250.5)
        ->assertJsonPath('data.0.original_currency', 'EUR');

    $this->actingAs($this->investor)
        ->getJson('/api/investor/deposits?'.http_build_query([...$params, 'page' => 2]))
        ->assertOk()
        ->assertJsonPath('current_page', 2)
        ->assertJsonPath('total', 2)
        ->assertJsonPath('data.0.id', $olderMatch->id);

    $this->actingAs($this->investor)
        ->getJson('/api/investor/deposits?'.http_build_query([
            'reference' => 'bank-transfer-search',
        ]))
        ->assertOk()
        ->assertJsonPath('total', 1);

    $this->actingAs($this->investor)
        ->getJson('/api/investor/deposits?'.http_build_query([
            'date_from' => $today->copy()->subDays(2)->toDateString(),
            'date_to' => $today->copy()->subDays(8)->toDateString(),
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['date_to']);
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
    $notification = AppNotification::query()
        ->where('user_id', $this->investor->id)
        ->where('type', 'investment_completed')
        ->sole();
    expect($investment->status)->toBe('completed')
        ->and((float) $investment->profit_amount)->toBe(80.0)
        ->and($notification->data['investment_id'])->toBe($investment->id)
        ->and($notification->data['transaction_status'])->toBe('completed')
        ->and($notification->data['href'])->toBe("/invest/positions/{$investment->id}");

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
        ->assertJsonPath('data.payment_method', 'Bank Transfer')
        ->assertJsonPath('data.estimated_processing_time', '1 to 2 working days');
    $withdrawalId = $response->json('data.id');

    $submittedNotification = AppNotification::query()
        ->where('user_id', $this->investor->id)
        ->where('type', 'withdrawal_submitted')
        ->sole();
    expect($submittedNotification->data['transaction_status'])->toBe('pending')
        ->and($submittedNotification->data['withdrawal_id'])->toBe($withdrawalId)
        ->and($submittedNotification->data['href'])->toBe("/invest/transactions/withdrawal/{$withdrawalId}")
        ->and($submittedNotification->body)->toContain('not been approved or sent to your bank');

    $wallet = Wallet::query()->where('user_id', $this->investor->id)->first();
    expect((float) $wallet->available_balance)->toBe(7498.0)
        ->and((float) $wallet->pending_balance)->toBe(2502.0);

    $transaction = WalletTransaction::query()
        ->where('meta->withdrawal_id', $withdrawalId)
        ->firstOrFail();
    $withdrawal = Withdrawal::query()->findOrFail($withdrawalId);
    expect((float) $transaction->amount)->toBe(2502.0)
        ->and((float) $transaction->meta['payout_amount'])->toBe(2500.0)
        ->and((float) $transaction->meta['fee'])->toBe(2.0)
        ->and((float) $transaction->meta['total_debit'])->toBe(2502.0)
        ->and($transaction->meta['payment_method'])->toBe('Bank Transfer');

    expect($withdrawal->fresh()->bank_details['payment_method'])->toBe('Bank Transfer');

    $this->actingAs($this->investor)
        ->getJson("/api/investor/wallet/transactions/{$transaction->id}")
        ->assertOk()
        ->assertJsonPath('data.withdrawal_breakdown.payout_amount', 2500)
        ->assertJsonPath('data.withdrawal_breakdown.fee', 2)
        ->assertJsonPath('data.withdrawal_breakdown.total_debit', 2502)
        ->assertJsonPath('data.withdrawal_breakdown.currency', 'USD')
        ->assertJsonPath('data.withdrawal_breakdown.exchange_rate', null);

    $this->actingAs($this->investor)
        ->getJson('/api/investor/withdrawals')
        ->assertOk()
        ->assertJsonPath('data.0.amount', 2500)
        ->assertJsonPath('data.0.fee', 2)
        ->assertJsonPath('data.0.total_debit', 2502)
        ->assertJsonPath('data.0.currency', 'USD')
        ->assertJsonPath('data.0.payment_method', 'Bank Transfer')
        ->assertJsonPath('data.0.exchange_rate', null);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/finance/withdrawals/{$withdrawalId}/approve")
        ->assertOk();

    $approvedNotification = AppNotification::query()
        ->where('user_id', $this->investor->id)
        ->where('type', 'withdrawal_approved')
        ->sole();
    $wallet->refresh();
    $transaction->refresh();
    expect((float) $wallet->available_balance)->toBe(7498.0)
        ->and((float) $wallet->pending_balance)->toBe(0.0)
        ->and($transaction->status)->toBe('completed')
        ->and((float) $transaction->amount)->toBe(2502.0)
        ->and($approvedNotification->title)->toContain('approved')
        ->and($approvedNotification->title)->not->toContain('completed')
        ->and($approvedNotification->body)->toContain('does not confirm that funds have reached your bank account')
        ->and($approvedNotification->body)->not->toContain('transferred to your registered bank account')
        ->and($approvedNotification->data['transaction_status'])->toBe('approved')
        ->and($approvedNotification->data['href'])->toBe("/invest/transactions/withdrawal/{$withdrawalId}");
});

it('does not invent a fee for older withdrawals without a recorded fee', function () {
    $withdrawal = Withdrawal::query()->create([
        'investor_id' => $this->investor->id,
        'amount' => 2500,
        'bank_details' => [
            'bank_name' => 'Test Bank',
            'account_holder' => 'Jane Investor',
            'account_number' => '1234567890',
            'currency' => 'USD',
        ],
        'reference' => 'OGWITH-LEGACY-001',
        'status' => 'pending',
    ]);
    $transaction = WalletTransaction::query()->create([
        'wallet_id' => Wallet::query()->where('user_id', $this->investor->id)->value('id'),
        'type' => 'withdrawal',
        'amount' => 2500,
        'direction' => 'debit',
        'reference' => $withdrawal->reference,
        'status' => 'pending',
        'meta' => ['withdrawal_id' => $withdrawal->id, 'currency' => 'USD'],
    ]);

    $this->actingAs($this->investor)
        ->getJson("/api/investor/withdrawals/{$withdrawal->id}")
        ->assertOk()
        ->assertJsonPath('data.fee', null)
        ->assertJsonPath('data.fee_usd', null)
        ->assertJsonPath('data.withdrawal_fee', null)
        ->assertJsonPath('data.total_debit', 2500);

    $this->actingAs($this->investor)
        ->getJson('/api/investor/withdrawals')
        ->assertOk()
        ->assertJsonPath('data.0.fee', null)
        ->assertJsonPath('data.0.total_debit', 2500)
        ->assertJsonPath('data.0.currency', 'USD');

    $detail = $this->actingAs($this->investor)
        ->getJson("/api/investor/wallet/transactions/{$transaction->id}")
        ->assertOk()
        ->assertJsonPath('data.withdrawal_breakdown.fee', null)
        ->assertJsonPath('data.withdrawal_breakdown.fee_usd', null)
        ->assertJsonPath('data.withdrawal_breakdown.total_debit', 2500)
        ->assertJsonPath('data.withdrawal_breakdown.currency', 'USD');

    $breakdown = \App\Support\InvestorWithdrawalBreakdown::fromWithdrawal($withdrawal, $transaction);
    $html = view('pdf.withdrawal-receipt', [
        'withdrawal' => $withdrawal,
        'withdrawalBreakdown' => $breakdown,
        'user' => $this->investor,
        'generatedAt' => now()->format('d M Y H:i'),
    ])->render();

    expect($html)
        ->toContain('Requested bank payout')
        ->toContain('Total wallet debit')
        ->toContain('USD 2,500.00')
        ->toContain('Not recorded')
        ->not->toContain('USD 0.00');

    $this->actingAs($this->investor)
        ->get("/api/investor/withdrawals/{$withdrawal->id}/pdf")
        ->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');

    $this->actingAs($this->investor)
        ->get("/api/investor/wallet/transactions/{$transaction->id}/pdf")
        ->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');
});

it('returns a historical fee when it was recorded in wallet transaction metadata', function () {
    $withdrawal = Withdrawal::query()->create([
        'investor_id' => $this->investor->id,
        'amount' => 2500,
        'bank_details' => [
            'bank_name' => 'Test Bank',
            'account_holder' => 'Jane Investor',
            'account_number' => '1234567890',
            'currency' => 'USD',
        ],
        'reference' => 'OGWITH-LEGACY-002',
        'status' => 'pending',
    ]);
    WalletTransaction::query()->create([
        'wallet_id' => Wallet::query()->where('user_id', $this->investor->id)->value('id'),
        'type' => 'withdrawal',
        'amount' => 2503,
        'direction' => 'debit',
        'reference' => $withdrawal->reference,
        'status' => 'pending',
        'meta' => [
            'withdrawal_id' => $withdrawal->id,
            'currency' => 'USD',
            'fee' => 3,
            'fee_usd' => 3,
            'total_debit' => 2503,
            'total_debit_usd' => 2503,
        ],
    ]);

    $this->actingAs($this->investor)
        ->getJson('/api/investor/withdrawals')
        ->assertOk()
        ->assertJsonPath('data.0.fee', 3)
        ->assertJsonPath('data.0.fee_usd', 3)
        ->assertJsonPath('data.0.total_debit', 2503)
        ->assertJsonPath('data.0.total_debit_usd', 2503);
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

    $rejectedNotification = AppNotification::query()
        ->where('user_id', $this->investor->id)
        ->where('type', 'withdrawal_rejected')
        ->sole();
    $wallet = Wallet::query()->where('user_id', $this->investor->id)->first();
    $transaction = WalletTransaction::query()
        ->where('meta->withdrawal_id', $withdrawalId)
        ->firstOrFail();
    expect((float) $wallet->available_balance)->toBe(10000.0)
        ->and((float) $wallet->pending_balance)->toBe(0.0)
        ->and($transaction->status)->toBe('rejected')
        ->and((float) $transaction->amount)->toBe(2502.0)
        ->and($rejectedNotification->data['transaction_status'])->toBe('rejected')
        ->and($rejectedNotification->data['href'])->toBe("/invest/transactions/withdrawal/{$withdrawalId}")
        ->and($rejectedNotification->body)->not->toContain('funds have been returned');
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
