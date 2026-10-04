<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\InvestorMonthlyStatementService;
use Carbon\Carbon;
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