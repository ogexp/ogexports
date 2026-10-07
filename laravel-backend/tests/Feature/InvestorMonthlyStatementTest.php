<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\Withdrawal;
use App\Services\InvestorMonthlyStatementService;
use Carbon\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvestorMonthlyStatementTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_statement_calculates_month_end_balances_from_posted_wallet_events(): void
    {
        Carbon::setTestNow('2026-11-12 10:00:00');
        $investor = User::factory()->create();
        $wallet = Wallet::query()->create([
            'user_id' => $investor->id,
            'currency' => 'USD',
            'available_balance' => 78,
            'pending_balance' => 5,
        ]);

        $this->transaction($wallet, 'deposit', 100, 'credit', 'completed', '2026-07-03 09:00:00', '2026-07-03 09:00:00');
        $this->transaction($wallet, 'investment', 25, 'debit', 'completed', '2026-08-05 12:00:00', '2026-08-05 12:00:00');
        $this->transaction($wallet, 'profit', 8, 'credit', 'completed', '2026-08-18 15:00:00', '2026-08-18 15:00:00');
        $this->transaction($wallet, 'fee', 2, 'debit', 'completed', '2026-08-20 10:00:00', '2026-08-20 10:00:00');
        $this->transaction($wallet, 'withdrawal', 5, 'debit', 'pending', '2026-08-24 10:00:00', '2026-08-24 10:00:00');
        $this->transaction($wallet, 'withdrawal', 10, 'debit', 'completed', '2026-08-26 10:00:00', '2026-09-02 10:00:00');
        $this->transaction(
            $wallet,
            'investment_return',
            12,
            'credit',
            'completed',
            '2026-09-05 10:00:00',
            '2026-09-05 10:00:00',
            ['invested_amount' => 10, 'profit_amount' => 2],
        );

        $statement = app(InvestorMonthlyStatementService::class)->build($investor, '2026-08');

        $this->assertSame('2026-08', $statement['month']);
        $this->assertSame('USD', $statement['currency']);
        $this->assertSame(100.0, $statement['opening_balance']);
        $this->assertSame(0.0, $statement['deposits']);
        $this->assertSame(25.0, $statement['investments']);
        $this->assertSame(8.0, $statement['distributions']);
        $this->assertSame(0.0, $statement['withdrawals']);
        $this->assertSame(-2.0, $statement['other_movements']);
        $this->assertSame(81.0, $statement['closing_balance']);
        $this->assertCount(3, $statement['transactions']);
        $this->assertSame('2026-08-20', Carbon::parse($statement['transactions'][0]['date_time'])->format('Y-m-d'));
        $this->assertContains('2026-08', $statement['available_months']);

        $september = app(InvestorMonthlyStatementService::class)->build($investor, '2026-09');
        $this->assertSame(81.0, $september['opening_balance']);
        $this->assertSame(10.0, $september['principal_returns']);
        $this->assertSame(2.0, $september['distributions']);
        $this->assertSame(10.0, $september['withdrawals']);
        $this->assertSame(0.0, $september['other_movements']);
        $this->assertSame(83.0, $september['closing_balance']);
    }

    public function test_statement_includes_withdrawal_breakdown_and_usd_snapshot_without_changing_balances(): void
    {
        Carbon::setTestNow('2026-11-12 10:00:00');
        $this->seed(RoleSeeder::class);
        $investor = User::factory()->create(['account_status' => 'active']);
        $investor->assignRole('investor');
        $wallet = Wallet::query()->create([
            'user_id' => $investor->id,
            'currency' => 'PKR',
            'available_balance' => 723,
            'pending_balance' => 0,
        ]);
        $withdrawal = Withdrawal::query()->create([
            'investor_id' => $investor->id,
            'amount' => 27850,
            'exchange_rate' => 278.5,
            'fee' => 557,
            'total_debit' => 28407,
            'bank_details' => ['currency' => 'PKR'],
            'reference' => 'OGWITH-STATEMENT-SNAPSHOT',
            'status' => 'completed',
        ]);
        $this->transaction(
            $wallet,
            'withdrawal',
            28407,
            'debit',
            'completed',
            '2026-08-26 10:00:00',
            '2026-08-26 10:00:00',
            ['withdrawal_id' => $withdrawal->id, 'currency' => 'PKR'],
        );

        $statement = app(InvestorMonthlyStatementService::class)->build($investor, '2026-08');
        $breakdown = $statement['transactions'][0]['withdrawal_breakdown'];

        $this->assertSame(29130.0, $statement['opening_balance']);
        $this->assertSame(28407.0, $statement['withdrawals']);
        $this->assertSame(723.0, $statement['closing_balance']);
        $this->assertSame(27850.0, $breakdown['payout_amount']);
        $this->assertSame(100.0, $breakdown['payout_amount_usd']);
        $this->assertSame(557.0, $breakdown['fee']);
        $this->assertSame(2.0, $breakdown['fee_usd']);
        $this->assertSame(28407.0, $breakdown['total_debit']);
        $this->assertSame(102.0, $breakdown['total_debit_usd']);
        $this->assertSame('PKR', $breakdown['currency']);
        $this->assertSame(278.5, $breakdown['exchange_rate']);

        $this->actingAs($investor)
            ->getJson('/api/investor/statements?month=2026-08')
            ->assertOk()
            ->assertJsonPath('data.transactions.0.withdrawal_breakdown.fee', 557)
            ->assertJsonPath('data.transactions.0.withdrawal_breakdown.total_debit_usd', 102);
        $pdf = $this->actingAs($investor)
            ->get('/api/investor/statements/2026-08/pdf')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $pdf->getContent());

        $html = view('pdf.investor-monthly-statement', [
            'statement' => $statement,
            'investor' => $investor,
        ])->render();
        $htmlText = preg_replace('/\s+/', ' ', preg_replace('/<br\s*\/?>/i', ' ', $html) ?? $html) ?? $html;
        $this->assertStringContainsString('Payout:', $htmlText);
        $this->assertStringContainsString('PKR 27,850.00 (USD 100.00)', $htmlText);
        $this->assertStringContainsString('Fee: PKR 557.00 (USD 2.00)', $htmlText);
        $this->assertStringContainsString('Total wallet debit: PKR 28,407.00 (USD 102.00)', $htmlText);
    }

    public function test_statement_uses_saved_usd_fields_when_no_exchange_rate_snapshot_exists(): void
    {
        Carbon::setTestNow('2026-11-12 10:00:00');
        $investor = User::factory()->create();
        $wallet = Wallet::query()->create([
            'user_id' => $investor->id,
            'currency' => 'PKR',
            'available_balance' => 102,
            'pending_balance' => 0,
        ]);
        $withdrawal = Withdrawal::query()->create([
            'investor_id' => $investor->id,
            'amount' => 28000,
            'amount_usd' => 100,
            'fee' => 560,
            'fee_usd' => 2,
            'total_debit' => 28560,
            'total_debit_usd' => 102,
            'bank_details' => ['currency' => 'PKR'],
            'reference' => 'OGWITH-STATEMENT-USD-FIELDS',
            'status' => 'completed',
        ]);
        $this->transaction(
            $wallet,
            'withdrawal',
            28560,
            'debit',
            'completed',
            '2026-08-26 10:00:00',
            '2026-08-26 10:00:00',
            ['withdrawal_id' => $withdrawal->id, 'currency' => 'PKR'],
        );

        $statement = app(InvestorMonthlyStatementService::class)->build($investor, '2026-08');
        $breakdown = $statement['transactions'][0]['withdrawal_breakdown'];

        $this->assertSame(100.0, $breakdown['payout_amount_usd']);
        $this->assertSame(2.0, $breakdown['fee_usd']);
        $this->assertSame(102.0, $breakdown['total_debit_usd']);
        $this->assertNull($breakdown['exchange_rate']);
    }

    public function test_statement_does_not_infer_a_missing_historical_withdrawal_fee(): void
    {
        Carbon::setTestNow('2026-11-12 10:00:00');
        $investor = User::factory()->create();
        $wallet = Wallet::query()->create([
            'user_id' => $investor->id,
            'currency' => 'USD',
            'available_balance' => 7497,
            'pending_balance' => 0,
        ]);
        $withdrawal = Withdrawal::query()->create([
            'investor_id' => $investor->id,
            'amount' => 2500,
            'bank_details' => ['currency' => 'USD'],
            'reference' => 'OGWITH-STATEMENT-LEGACY',
            'status' => 'completed',
        ]);
        $this->transaction(
            $wallet,
            'withdrawal',
            2503,
            'debit',
            'completed',
            '2026-08-26 10:00:00',
            '2026-08-26 10:00:00',
            ['withdrawal_id' => $withdrawal->id, 'currency' => 'USD'],
        );

        $statement = app(InvestorMonthlyStatementService::class)->build($investor, '2026-08');
        $breakdown = $statement['transactions'][0]['withdrawal_breakdown'];

        $this->assertSame(10000.0, $statement['opening_balance']);
        $this->assertSame(2503.0, $statement['withdrawals']);
        $this->assertSame(7497.0, $statement['closing_balance']);
        $this->assertSame(2503.0, $breakdown['total_debit']);
        $this->assertSame(2503.0, $breakdown['total_debit_usd']);
        $this->assertNull($breakdown['fee']);
        $this->assertNull($breakdown['fee_usd']);

        $html = view('pdf.investor-monthly-statement', [
            'statement' => $statement,
            'investor' => $investor,
        ])->render();
        $htmlText = preg_replace('/\s+/', ' ', preg_replace('/<br\s*\/?>/i', ' ', $html) ?? $html) ?? $html;
        $this->assertStringContainsString('Fee: Not recorded', $htmlText);
    }

    private function transaction(
        Wallet $wallet,
        string $type,
        float $amount,
        string $direction,
        string $status,
        string $createdAt,
        string $updatedAt,
        array $meta = [],
    ): WalletTransaction {
        $transaction = WalletTransaction::query()->create([
            'wallet_id' => $wallet->id,
            'type' => $type,
            'amount' => $amount,
            'direction' => $direction,
            'status' => $status,
            'reference' => strtoupper($type).'-'.uniqid(),
            'meta' => $meta,
        ]);
        $transaction->timestamps = false;
        $transaction->forceFill([
            'created_at' => Carbon::parse($createdAt),
            'updated_at' => Carbon::parse($updatedAt),
        ])->save();
        $transaction->timestamps = true;

        return $transaction;
    }
}
