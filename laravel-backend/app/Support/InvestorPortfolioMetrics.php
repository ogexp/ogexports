<?php

namespace App\Support;

use App\Models\Investment;
use App\Models\InvestmentProfitDistribution;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class InvestorPortfolioMetrics
{
    /**
     * @return array{
     *   has_investments: bool,
     *   total_invested: float,
     *   total_invested_usd: float,
     *   total_profit_earned: float,
     *   total_profit_earned_usd: float|null,
     *   lifetime_roi: float,
     *   investments: Collection<int, Investment>
     * }
     */
    public static function summary(int $userId): array
    {
        $user = User::query()->with(['profile', 'wallet'])->find($userId);
        $isPkr = $user ? UserDisplayCurrency::isPkrUser($user) : false;
        $displayRate = $isPkr ? InvestorDepositFx::resolveDisplayRate($userId) : null;

        $investments = Investment::query()
            ->where('investor_id', $userId)
            ->with('project')
            ->orderByDesc('invested_at')
            ->get();

        $totalInvestedUsd = round((float) $investments->sum('amount'), 2);
        $totalInvested = InvestorProfitTotals::sumInvestedWallet($investments, $isPkr, $displayRate);
        $profit = InvestorProfitTotals::profitEarned($userId, $user);
        $profitEarned = $profit['wallet'];

        return [
            'has_investments' => $investments->isNotEmpty(),
            'total_invested' => $totalInvested,
            'total_invested_usd' => $totalInvestedUsd,
            'total_profit_earned' => $profitEarned,
            'total_profit_earned_usd' => $isPkr ? $profit['usd'] : null,
            'lifetime_roi' => $totalInvested > 0
                ? round(($profitEarned / $totalInvested) * 100, 2)
                : 0.0,
            'investments' => $investments,
        ];
    }

    public static function profitEarned(int $userId): float
    {
        return InvestorProfitTotals::profitEarned($userId)['wallet'];
    }

    /**
     * Monthly cumulative series for reports charts.
     *
     * @param  Collection<int, Investment>  $investments
     * @return list<array{month: string, month_key: string, investment: float, profit: float, roi: float}>
     */
    public static function monthlySeries(Collection $investments, int $userId): array
    {
        if ($investments->isEmpty()) {
            return [];
        }

        $user = User::query()->with(['profile', 'wallet'])->find($userId);
        $isPkr = $user ? UserDisplayCurrency::isPkrUser($user) : false;
        $displayRate = $isPkr ? InvestorDepositFx::resolveDisplayRate($userId) : null;

        $firstInvested = $investments
            ->filter(fn (Investment $inv) => $inv->invested_at !== null)
            ->min('invested_at');

        if (! $firstInvested) {
            return [];
        }

        $start = Carbon::parse($firstInvested)->startOfMonth();
        $end = now()->startOfMonth();

        // Cap at last 12 months for chart readability.
        $minStart = $end->copy()->subMonths(11);
        if ($start->lt($minStart)) {
            $start = $minStart;
        }

        $distributions = InvestmentProfitDistribution::query()
            ->where('investor_id', $userId)
            ->whereNotNull('distributed_at')
            ->get(['profit_amount', 'profit_amount_pkr', 'distributed_at']);

        $wallet = Wallet::query()->where('user_id', $userId)->first();
        $walletProfits = collect();
        if ($wallet) {
            $walletProfits = WalletTransaction::query()
                ->where('wallet_id', $wallet->id)
                ->where('direction', 'credit')
                ->whereIn('type', InvestorProfitTotals::WALLET_PROFIT_TYPES)
                ->where('status', 'completed')
                ->get(['amount', 'created_at']);
        }

        $series = [];
        $cursor = $start->copy();
        while ($cursor->lte($end)) {
            $monthEnd = $cursor->copy()->endOfMonth();

            $cumulativeInvestment = (float) $investments
                ->filter(function (Investment $inv) use ($monthEnd) {
                    if ($inv->invested_at === null) {
                        return false;
                    }

                    return Carbon::parse($inv->invested_at)->lte($monthEnd);
                })
                ->sum(fn (Investment $inv) => InvestorProfitTotals::investmentToWallet($inv, $isPkr, $displayRate));

            $distProfit = (float) $distributions
                ->filter(fn ($d) => Carbon::parse($d->distributed_at)->lte($monthEnd))
                ->sum(fn ($d) => InvestorProfitTotals::distributionToWallet($d, $isPkr, $displayRate));

            $walletProfit = (float) $walletProfits
                ->filter(fn ($tx) => $tx->created_at && $tx->created_at->lte($monthEnd))
                ->sum('amount');

            $cumulativeProfit = $distProfit + $walletProfit;
            $roi = $cumulativeInvestment > 0
                ? round(($cumulativeProfit / $cumulativeInvestment) * 100, 2)
                : 0.0;

            $series[] = [
                'month' => $cursor->format('M'),
                'month_key' => $cursor->format('Y-m'),
                'investment' => round($cumulativeInvestment, 2),
                'profit' => round($cumulativeProfit, 2),
                'roi' => $roi,
            ];

            $cursor->addMonth();
        }

        return $series;
    }
}
