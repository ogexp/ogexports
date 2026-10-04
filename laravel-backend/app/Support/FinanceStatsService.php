<?php

namespace App\Support;

use App\Models\Deposit;
use App\Models\InvestmentProfitDistribution;
use App\Models\Order;
use App\Models\PlatformWallet;
use App\Models\Wallet;
use App\Models\Withdrawal;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class FinanceStatsService
{
    private const DELIVERED_ORDER_STATUSES = ['delivered', 'completed'];

    /**
     * @return array<string, mixed>
     */
    public function overview(): array
    {
        $now = now();
        $monthStart = $now->copy()->startOfMonth();
        $prevMonthStart = $now->copy()->subMonth()->startOfMonth();
        $prevMonthEnd = $now->copy()->subMonth()->endOfMonth();

        $monthlyRevenue = $this->orderRevenue($monthStart, null);
        $prevMonthRevenue = $this->orderRevenue($prevMonthStart, $prevMonthEnd);
        $momPct = $this->pctChange($monthlyRevenue, $prevMonthRevenue);

        $monthlyWithdrawals = (float) Withdrawal::query()
            ->where('status', 'approved')
            ->where(function ($q) use ($monthStart) {
                $q->where('reviewed_at', '>=', $monthStart)
                    ->orWhere(function ($q2) use ($monthStart) {
                        $q2->whereNull('reviewed_at')->where('updated_at', '>=', $monthStart);
                    });
            })
            ->sum('amount');

        $walletBalances = (float) Wallet::query()
            ->selectRaw('COALESCE(SUM(available_balance), 0) + COALESCE(SUM(pending_balance), 0) as total')
            ->value('total');

        $platformWalletBalance = (float) PlatformWallet::query()->sum('balance');
        $platformBalance = round($walletBalances + $platformWalletBalance, 2);

        $portfolio = InvestmentCapacity::portfolioTotals();
        $totalInvestors = (int) ($portfolio['total_investors'] ?? 0);
        $totalRaised = (float) ($portfolio['total_raised'] ?? 0);
        $avgPortfolio = $totalInvestors > 0
            ? round($totalRaised / $totalInvestors, 2)
            : 0.0;

        $cumulativeReturns = (float) InvestmentProfitDistribution::query()->sum('profit_amount');

        return [
            'monthly_revenue' => round($monthlyRevenue, 2),
            'monthly_revenue_mom_pct' => $momPct,
            'monthly_withdrawals' => round($monthlyWithdrawals, 2),
            'month_label' => $now->format('M Y'),
            'platform_balance' => $platformBalance,
            'total_investors' => $totalInvestors,
            'avg_portfolio' => $avgPortfolio,
            'cumulative_returns' => round($cumulativeReturns, 2),
            'cashflow' => $this->cashflow(7),
        ];
    }

    /**
     * @return list<array{month: string, deposits: float, withdrawals: float, profit: float}>
     */
    public function cashflow(int $months = 7): array
    {
        $start = now()->startOfMonth()->subMonths($months - 1);
        $depositBuckets = $this->monthlyDepositTotals($start);
        $withdrawalBuckets = $this->monthlyWithdrawalTotals($start);
        $profitBuckets = $this->monthlyProfitTotals($start);

        $points = [];
        for ($i = 0; $i < $months; $i++) {
            $month = $start->copy()->addMonths($i);
            $key = $month->format('Y-m');
            $points[] = [
                'month' => $month->format('M'),
                'deposits' => round((float) ($depositBuckets[$key] ?? 0), 2),
                'withdrawals' => round((float) ($withdrawalBuckets[$key] ?? 0), 2),
                'profit' => round((float) ($profitBuckets[$key] ?? 0), 2),
            ];
        }

        return $points;
    }

    /**
     * @return array<string, float>
     */
    private function monthlyDepositTotals(Carbon $start): array
    {
        $monthExpr = $this->monthBucketExpression('COALESCE(reviewed_at, updated_at, created_at)');

        $investor = Deposit::query()
            ->where('status', DepositReviewStatuses::APPROVED)
            ->where(function ($q) use ($start) {
                $q->where('reviewed_at', '>=', $start)
                    ->orWhere(function ($q2) use ($start) {
                        $q2->whereNull('reviewed_at')->where('updated_at', '>=', $start);
                    });
            })
            ->select(DB::raw("{$monthExpr} as ym"), DB::raw('SUM(amount) as total'))
            ->groupBy('ym')
            ->pluck('total', 'ym')
            ->all();

        $buyerMonthExpr = $this->monthBucketExpression('COALESCE(payment_submitted_at, updated_at, created_at)');
        $buyer = Order::query()
            ->whereIn('payment_status', DepositReviewStatuses::buyerApprovedStorage())
            ->where(function ($q) use ($start) {
                $q->where('payment_submitted_at', '>=', $start)
                    ->orWhere(function ($q2) use ($start) {
                        $q2->whereNull('payment_submitted_at')->where('updated_at', '>=', $start);
                    });
            })
            ->select(DB::raw("{$buyerMonthExpr} as ym"), DB::raw('SUM(total_value) as total'))
            ->groupBy('ym')
            ->pluck('total', 'ym')
            ->all();

        $merged = [];
        foreach (array_unique(array_merge(array_keys($investor), array_keys($buyer))) as $key) {
            $merged[$key] = (float) ($investor[$key] ?? 0) + (float) ($buyer[$key] ?? 0);
        }

        return $merged;
    }

    /**
     * @return array<string, float>
     */
    private function monthlyWithdrawalTotals(Carbon $start): array
    {
        $monthExpr = $this->monthBucketExpression('COALESCE(reviewed_at, updated_at, created_at)');

        return Withdrawal::query()
            ->where('status', 'approved')
            ->where(function ($q) use ($start) {
                $q->where('reviewed_at', '>=', $start)
                    ->orWhere(function ($q2) use ($start) {
                        $q2->whereNull('reviewed_at')->where('updated_at', '>=', $start);
                    });
            })
            ->select(DB::raw("{$monthExpr} as ym"), DB::raw('SUM(amount) as total'))
            ->groupBy('ym')
            ->pluck('total', 'ym')
            ->map(fn ($v) => (float) $v)
            ->all();
    }

    /**
     * @return array<string, float>
     */
    private function monthlyProfitTotals(Carbon $start): array
    {
        $monthExpr = $this->monthBucketExpression('COALESCE(distributed_at, created_at)');

        return InvestmentProfitDistribution::query()
            ->where(function ($q) use ($start) {
                $q->where('distributed_at', '>=', $start)
                    ->orWhere(function ($q2) use ($start) {
                        $q2->whereNull('distributed_at')->where('created_at', '>=', $start);
                    });
            })
            ->select(DB::raw("{$monthExpr} as ym"), DB::raw('SUM(profit_amount) as total'))
            ->groupBy('ym')
            ->pluck('total', 'ym')
            ->map(fn ($v) => (float) $v)
            ->all();
    }

    private function orderRevenue(?Carbon $from, ?Carbon $to): float
    {
        $q = Order::query()->whereIn('status', self::DELIVERED_ORDER_STATUSES);

        if ($from) {
            $q->where(function ($inner) use ($from) {
                $inner->where('placed_at', '>=', $from)
                    ->orWhere(function ($q2) use ($from) {
                        $q2->whereNull('placed_at')->where('created_at', '>=', $from);
                    });
            });
        }

        if ($to) {
            $q->where(function ($inner) use ($to) {
                $inner->where('placed_at', '<=', $to)
                    ->orWhere(function ($q2) use ($to) {
                        $q2->whereNull('placed_at')->where('created_at', '<=', $to);
                    });
            });
        }

        return (float) $q->sum('total_value');
    }

    private function pctChange(float $current, float $previous): float
    {
        if ($previous <= 0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    private function monthBucketExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m', {$column})",
            'pgsql' => "TO_CHAR({$column}, 'YYYY-MM')",
            default => "DATE_FORMAT({$column}, '%Y-%m')",
        };
    }
}
