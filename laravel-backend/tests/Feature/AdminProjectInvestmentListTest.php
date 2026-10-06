<?php

use App\Models\AppNotification;
use App\Models\Deposit;
use App\Models\Investment;
use App\Models\InvestmentPayoutProgress;
use App\Models\InvestmentProfitDistribution;
use App\Models\InvestmentProject;
use App\Models\KycApplication;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Support\PlatformWalletService;
use Database\Seeders\EmailTemplateSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpClientRequest;
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

    $this->admin = User::factory()->create(['account_status' => 'active', 'name' => 'Admin User']);
    $this->admin->assignRole('admin');

    $this->investor = User::factory()->create([
        'account_status' => 'active',
        'name' => 'Jane Investor',
        'email' => 'jane@investor.test',
    ]);
    $this->investor->assignRole('investor');

    UserProfile::query()->create([
        'user_id' => $this->investor->id,
        'avatar_url' => 'upload/avatars/test-avatar.jpg',
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
        'title' => 'Mango Export Container',
        'type' => 'container',
        'status' => 'funding',
        'target_amount' => 10000,
        'raised_amount' => 0,
        'investors_count' => 0,
        'min_investment' => 100,
        'expected_return_pct' => 8,
        'image_url' => 'upload/investmentproject/1/cover.jpg',
    ]);
});

function createPendingInvestment(User $investor, InvestmentProject $project, float $amount = 1000): Investment
{
    $wallet = Wallet::query()->firstOrCreate(
        ['user_id' => $investor->id],
        ['currency' => 'USD', 'available_balance' => 0, 'pending_balance' => 0]
    );

    $wallet->update([
        'available_balance' => 0,
        'pending_balance' => $amount,
    ]);

    $investment = Investment::query()->create([
        'project_id' => $project->id,
        'investor_id' => $investor->id,
        'amount' => $amount,
        'status' => 'pending',
        'reference' => 'INV-TEST-'.uniqid(),
        'invested_at' => now(),
    ]);

    WalletTransaction::query()->create([
        'wallet_id' => $wallet->id,
        'type' => 'investment',
        'amount' => $amount,
        'direction' => 'debit',
        'reference' => $investment->reference,
        'status' => 'pending',
        'meta' => ['investment_id' => $investment->id, 'project_id' => $project->id],
    ]);

    return $investment;
}

it('lists project investments with project title and investor profile for admin', function () {
    createPendingInvestment($this->investor, $this->project);

    $this->actingAs($this->admin)
        ->getJson('/api/admin/project-investments')
        ->assertOk()
        ->assertJsonPath('data.0.project.title', 'Mango Export Container')
        ->assertJsonPath('data.0.investor.name', 'Jane Investor')
        ->assertJsonPath('data.0.investor.email', 'jane@investor.test')
        ->assertJsonPath('data.0.status', 'pending')
        ->assertJsonPath('data.0.payment_source', 'wallet')
        ->assertJsonPath('data.0.payment_source_label', 'OG Wallet');
});

it('includes project target and remaining amounts on project investment list', function () {
    createPendingInvestment($this->investor, $this->project, 1000);

    $this->actingAs($this->admin)
        ->getJson('/api/admin/project-investments?project_id='.$this->project->id)
        ->assertOk()
        ->assertJsonPath('data.0.project.target_amount', 10000)
        ->assertJsonPath('data.0.project.raised_amount', 0)
        ->assertJsonPath('data.0.project.pending_reserved', 1000)
        ->assertJsonPath('data.0.project.remaining_amount', 9000)
        ->assertJsonPath('data.0.project.investors_count', 1);
});

it('shows a single project investment detail', function () {
    $investment = createPendingInvestment($this->investor, $this->project, 2500);

    $this->actingAs($this->admin)
        ->getJson("/api/admin/project-investments/{$investment->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $investment->id)
        ->assertJsonPath('data.amount', 2500)
        ->assertJsonPath('data.project.title', 'Mango Export Container')
        ->assertJsonPath('data.project.target_amount', 10000)
        ->assertJsonPath('data.project.remaining_amount', 7500);
});

it('lets admins save pre-payment payout progress and returns it to the investor', function () {
    $investment = createPendingInvestment($this->investor, $this->project, 2500);
    $investment->update(['status' => 'active']);

    $this->actingAs($this->admin)
        ->patchJson("/api/admin/investment-payout-progress/{$investment->id}", [
            'status' => 'scheduled',
            'planned_distribution_date' => '2026-11-15',
        ])
        ->assertOk()
        ->assertJsonPath('data.payout_status', 'scheduled')
        ->assertJsonPath('data.planned_distribution_date', '2026-11-15')
        ->assertJsonPath('data.distributed_at', null);

    $this->actingAs($this->investor)
        ->getJson("/api/investor/investments/{$investment->id}")
        ->assertOk()
        ->assertJsonPath('data.profit_distribution.status', 'scheduled')
        ->assertJsonPath('data.profit_distribution.planned_distribution_date', '2026-11-15')
        ->assertJsonPath('data.profit_distribution.distributed_at', null);

    $this->actingAs($this->admin)
        ->patchJson("/api/admin/investment-payout-progress/{$investment->id}", [
            'status' => 'processing',
            'planned_distribution_date' => '2026-11-15',
        ])
        ->assertOk()
        ->assertJsonPath('data.payout_status', 'processing');

    $this->actingAs($this->investor)
        ->getJson("/api/investor/investments/{$investment->id}")
        ->assertOk()
        ->assertJsonPath('data.profit_distribution.status', 'processing');

    $this->actingAs($this->admin)
        ->getJson('/api/admin/investment-payout-progress')
        ->assertOk()
        ->assertJsonPath('data.0.investment_id', $investment->id)
        ->assertJsonPath('data.0.payout_status', 'processing')
        ->assertJsonPath('data.0.planned_distribution_date', '2026-11-15');

    expect(InvestmentPayoutProgress::query()->where('investment_id', $investment->id)->exists())->toBeTrue();
    expect(InvestmentProfitDistribution::query()->where('investment_id', $investment->id)->exists())->toBeFalse();
});

it('notifies investors once for each actual scheduled or processing payout progress change', function () {
    config(['mail.default' => 'array']);
    $signingSecret = str_repeat('payout-bridge-test-secret-', 2);
    config([
        'services.investor_push.url' => null,
        'services.investor_push.replit_domains' => 'api.example.test,portal.example.test',
        'services.investor_push.session_secret' => $signingSecret,
    ]);
    Http::fake([
        'https://api.example.test/*' => Http::response(['accepted_devices' => 1], 200),
    ]);
    $this->seed(EmailTemplateSeeder::class);

    $investment = createPendingInvestment($this->investor, $this->project, 2500);
    $investment->update(['status' => 'active']);

    $saveProgress = fn (string $status, ?string $plannedDate) => $this->actingAs($this->admin)
        ->patchJson("/api/admin/investment-payout-progress/{$investment->id}", [
            'status' => $status,
            'planned_distribution_date' => $plannedDate,
        ]);

    $saveProgress('scheduled', '2026-11-15')
        ->assertOk()
        ->assertJsonPath('data.payout_status', 'scheduled')
        ->assertJsonPath('data.distributed_at', null);

    $notification = AppNotification::query()
        ->where('user_id', $this->investor->id)
        ->where('type', 'payout_progress')
        ->sole();

    expect($notification->title)->toBe('Payout update: Scheduled')
        ->and($notification->body)->toContain('planned date is 2026-11-15')
        ->and($notification->body)->toContain('not proof that payment has been completed')
        ->and($notification->data['investment_id'])->toBe($investment->id)
        ->and($notification->data['planned_distribution_date'])->toBe('2026-11-15')
        ->and(InvestmentProfitDistribution::query()->where('investment_id', $investment->id)->exists())->toBeFalse();

    $saveProgress('scheduled', '2026-11-15')->assertOk();
    expect(AppNotification::query()->where('user_id', $this->investor->id)->where('type', 'payout_progress')->count())->toBe(1)
        ->and(Mail::mailer('array')->getSymfonyTransport()->messages())->toHaveCount(1);
    Http::assertSentCount(1);

    $saveProgress('processing', '2026-11-15')
        ->assertOk()
        ->assertJsonPath('data.payout_status', 'processing')
        ->assertJsonPath('data.distributed_at', null);

    $processingNotification = AppNotification::query()
        ->where('user_id', $this->investor->id)
        ->where('type', 'payout_progress')
        ->latest('id')
        ->firstOrFail();

    expect($processingNotification->title)->toBe('Payout update: Processing')
        ->and($processingNotification->body)->toContain('does not confirm that payment has been completed')
        ->and(AppNotification::query()->where('user_id', $this->investor->id)->where('type', 'payout_progress')->count())->toBe(2)
        ->and(Mail::mailer('array')->getSymfonyTransport()->messages())->toHaveCount(2)
        ->and(InvestmentProfitDistribution::query()->where('investment_id', $investment->id)->exists())->toBeFalse();

    Http::assertSentCount(2);
    Http::assertSent(fn (HttpClientRequest $request) => $request->data()['status'] === 'scheduled');
    Http::assertSent(fn (HttpClientRequest $request) => $request->data()['status'] === 'processing');
    Http::assertSent(function (HttpClientRequest $request) use ($signingSecret) {
        $timestamp = $request->header('X-OG-Payout-Timestamp')[0] ?? '';
        $signature = $request->header('X-OG-Payout-Signature')[0] ?? '';
        $key = hash_hmac('sha256', 'ogexports:investor-payout-push:v1', $signingSecret, true);
        $expected = 'sha256='.hash_hmac('sha256', $timestamp."\n".$request->body(), $key);

        return hash_equals($expected, $signature);
    });
});

it('respects payout email and in-app notification preferences independently', function () {
    config(['mail.default' => 'array']);
    config([
        'services.investor_push.url' => 'https://api.example.test/api/internal/investor-payout-progress',
        'services.investor_push.session_secret' => str_repeat('payout-bridge-test-secret-', 2),
    ]);
    Http::fake([
        'https://api.example.test/*' => Http::response(['accepted_devices' => 1], 200),
    ]);
    $this->seed(EmailTemplateSeeder::class);
    $profile = UserProfile::query()->where('user_id', $this->investor->id)->firstOrFail();
    $profile->update(['meta' => ['notification_prefs' => ['email' => false]]]);

    $investment = createPendingInvestment($this->investor, $this->project, 2500);
    $investment->update(['status' => 'active']);

    $this->actingAs($this->admin)
        ->patchJson("/api/admin/investment-payout-progress/{$investment->id}", [
            'status' => 'scheduled',
            'planned_distribution_date' => '2026-11-15',
        ])
        ->assertOk();

    expect(AppNotification::query()->where('user_id', $this->investor->id)->where('type', 'payout_progress')->count())->toBe(1)
        ->and(Mail::mailer('array')->getSymfonyTransport()->messages())->toHaveCount(0);

    $profile->update(['meta' => ['notification_prefs' => ['email' => true, 'investment' => false]]]);

    $this->actingAs($this->admin)
        ->patchJson("/api/admin/investment-payout-progress/{$investment->id}", [
            'status' => 'processing',
            'planned_distribution_date' => '2026-11-15',
        ])
        ->assertOk();

    expect(AppNotification::query()->where('user_id', $this->investor->id)->where('type', 'payout_progress')->count())->toBe(1)
        ->and(Mail::mailer('array')->getSymfonyTransport()->messages())->toHaveCount(1);
    Http::assertSentCount(2);
});

it('only shows a completed payout after a distribution timestamp is recorded', function () {
    $investment = createPendingInvestment($this->investor, $this->project, 2500);
    $investment->update(['status' => 'active']);
    InvestmentPayoutProgress::query()->create([
        'investment_id' => $investment->id,
        'status' => 'processing',
        'planned_distribution_date' => '2026-11-15',
    ]);

    $this->actingAs($this->investor)
        ->getJson("/api/investor/investments/{$investment->id}")
        ->assertOk()
        ->assertJsonPath('data.profit_distribution.status', 'processing')
        ->assertJsonPath('data.profit_distribution.distributed_at', null);

    InvestmentProfitDistribution::query()->create([
        'investment_id' => $investment->id,
        'project_id' => $this->project->id,
        'investor_id' => $this->investor->id,
        'project_type' => 'container',
        'invested_amount' => 2500,
        'profit_amount' => 200,
        'total_return' => 2700,
        'roi_pct' => 8,
        'distributed_at' => now(),
    ]);

    $this->actingAs($this->investor)
        ->getJson("/api/investor/investments/{$investment->id}")
        ->assertOk()
        ->assertJsonPath('data.profit_distribution.status', 'distributed')
        ->assertJsonPath('data.profit_distribution.distributed_at', fn ($value) => is_string($value));

    $this->actingAs($this->admin)
        ->patchJson("/api/admin/investment-payout-progress/{$investment->id}", [
            'status' => 'processing',
            'planned_distribution_date' => '2026-11-15',
        ])
        ->assertUnprocessable();
});

it('approves a pending project investment via global endpoint', function () {
    $investment = createPendingInvestment($this->investor, $this->project, 3000);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/project-investments/{$investment->id}/approve")
        ->assertOk()
        ->assertJsonPath('data.status', 'active');

    expect($this->project->fresh()->raised_amount)->toBe('3000.00')
        ->and($investment->fresh()->status)->toBe('active');
});

it('rejects a pending project investment and refunds wallet', function () {
    $investment = createPendingInvestment($this->investor, $this->project, 1500);
    $wallet = Wallet::query()->where('user_id', $this->investor->id)->first();

    $this->actingAs($this->admin)
        ->postJson("/api/admin/project-investments/{$investment->id}/reject")
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled');

    $wallet->refresh();
    expect((float) $wallet->available_balance)->toBe(1500.0)
        ->and((float) $wallet->pending_balance)->toBe(0.0)
        ->and($investment->fresh()->status)->toBe('cancelled');
});

it('updates status from pending to active via patch', function () {
    $investment = createPendingInvestment($this->investor, $this->project, 1200);

    $this->actingAs($this->admin)
        ->patchJson("/api/admin/project-investments/{$investment->id}/status", ['status' => 'active'])
        ->assertOk()
        ->assertJsonPath('data.status', 'active');
});

it('blocks invalid status transitions', function () {
    $investment = createPendingInvestment($this->investor, $this->project, 800);

    $this->actingAs($this->admin)
        ->patchJson("/api/admin/project-investments/{$investment->id}/status", ['status' => 'completed'])
        ->assertStatus(422);
});

it('requires admin authentication for project investment listing', function () {
    createPendingInvestment($this->investor, $this->project);

    $this->getJson('/api/admin/project-investments')
        ->assertUnauthorized();
});

it('creates pending investment when investor invests from project page', function () {
    PlatformWalletService::ensure('USD');

    Wallet::query()->create([
        'user_id' => $this->investor->id,
        'currency' => 'USD',
        'available_balance' => 5000,
        'pending_balance' => 0,
    ]);

    $this->actingAs($this->investor)
        ->postJson("/api/investor/projects/{$this->project->id}/invest", ['amount' => 1000])
        ->assertCreated();

    $this->actingAs($this->admin)
        ->getJson('/api/admin/project-investments?status=active')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.amount', 1000)
        ->assertJsonPath('data.0.project.title', 'Mango Export Container')
        ->assertJsonPath('data.0.payment_source', 'wallet')
        ->assertJsonPath('data.0.payment_source_label', 'OG Wallet');
});

it('includes wallet funding deposits for wallet investments', function () {
    $investment = createPendingInvestment($this->investor, $this->project, 2000);
    $investment->update(['payment_source' => 'wallet']);

    Deposit::query()->create([
        'investor_id' => $this->investor->id,
        'amount' => 5000,
        'currency' => 'USD',
        'method' => 'Bank Transfer',
        'reference' => 'DEP-BANK-001',
        'status' => 'approved',
        'project_id' => $this->project->id,
        'reviewed_at' => now()->subDay(),
    ]);

    $this->actingAs($this->admin)
        ->getJson("/api/admin/project-investments/{$investment->id}")
        ->assertOk()
        ->assertJsonPath('data.payment_source', 'wallet')
        ->assertJsonPath('data.wallet_funding_deposits.0.reference', 'DEP-BANK-001')
        ->assertJsonPath('data.wallet_funding_deposits.0.method_label', 'Bank Transfer');
});

it('resolves legacy investment payment source from wallet transaction', function () {
    $investment = createPendingInvestment($this->investor, $this->project, 1800);
    $investment->update(['payment_source' => null]);

    $this->actingAs($this->admin)
        ->getJson("/api/admin/project-investments/{$investment->id}")
        ->assertOk()
        ->assertJsonPath('data.payment_source', 'wallet')
        ->assertJsonPath('data.payment_source_label', 'OG Wallet');
});
