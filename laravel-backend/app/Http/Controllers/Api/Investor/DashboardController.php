<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\Deposit;
use App\Models\Investment;
use App\Models\InvestmentProject;
use App\Models\InvestmentProfitDistribution;
use App\Models\PlatformSetting;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\Withdrawal;
use App\Support\ContainerProjectStatus;
use App\Support\ExchangeRateService;
use App\Support\InvestmentCapacity;
use App\Support\InvestorDashboardFinance;
use App\Support\InvestorDepositFx;
use App\Support\InvestorMarket;
use App\Support\InvestorProfitTotals;
use App\Support\KycGate;
use App\Support\UserDisplayCurrency;
use App\Support\WithdrawalTerms;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class DashboardController extends Controller
{
    private const ALLOCATION_COLORS = [
        'container' => '#16a34a',
        'produce' => '#0ea5e9',
        'plant' => '#D4A012',
        'ricemill' => '#059669',
        'feed' => '#ca8a04',
        'cold_storage' => '#8b5cf6',
        'domestic_trading' => '#f97316',
        'other' => '#6b7280',
        'available' => '#94a3b8',
    ];

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing(['latestKycApplication', 'profile']);
        $userId = $user->id;

        $wallet = Wallet::query()->firstOrCreate(
            ['user_id' => $userId],
            [
                'currency' => InvestorMarket::currencyForUser($user),
                'available_balance' => 0,
                'pending_balance' => 0,
            ]
        );

        $investments = Investment::query()
            ->where('investor_id', $userId)
            ->with('project')
            ->orderByDesc('invested_at')
            ->get();

        $walletCurrency = strtoupper((string) ($wallet->currency ?: InvestorMarket::currencyForUser($user)));
        $withdrawalTerms = WithdrawalTerms::forCurrency($walletCurrency);

        $totalInvestedUsd = (float) $investments->sum('amount');
        $activeInvestments = $investments->whereIn('status', ['pending', 'active']);
        $activeInvestedUsd = (float) $activeInvestments->sum('amount');

        $toWalletAmount = function (Investment $inv) use ($walletCurrency): float {
            if ($walletCurrency === 'PKR') {
                if ($inv->amount_pkr !== null) {
                    return (float) $inv->amount_pkr;
                }
                try {
                    return (float) ExchangeRateService::convert(
                        (float) $inv->amount,
                        'USD',
                        'PKR'
                    )['amount'];
                } catch (\Throwable) {
                    return (float) $inv->amount;
                }
            }

            return (float) $inv->amount;
        };

        $totalInvested = (float) $investments->sum($toWalletAmount);
        $activeInvested = (float) $activeInvestments->sum($toWalletAmount);
        $activeCount = $activeInvestments->count();

        $isPkrInvestor = UserDisplayCurrency::isPkrUser($user);
        $avgDepositRate = $isPkrInvestor
            ? InvestorDepositFx::weightedAverageDepositRate($userId)
            : null;
        $displayUsdRate = $isPkrInvestor
            ? InvestorDepositFx::resolveDisplayRate($userId)
            : null;

        $finance = InvestorDashboardFinance::forInvestor(
            $userId,
            $walletCurrency,
            $isPkrInvestor,
            $displayUsdRate,
        );

        $completedTxCount = WalletTransaction::query()
            ->where('wallet_id', $wallet->id)
            ->where('status', 'completed')
            ->count();

        $recentTransactions = WalletTransaction::query()
            ->where('wallet_id', $wallet->id)
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (WalletTransaction $tx) => $this->transformTransaction($tx))
            ->values();

        $recentDeposits = Deposit::query()
            ->where('investor_id', $userId)
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (Deposit $d) => $this->transformDeposit($d))
            ->values();

        $withdrawals = Withdrawal::query()
            ->where('investor_id', $userId)
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (Withdrawal $w) => $this->transformWithdrawal($w))
            ->values();

        $myInvestments = $investments
            ->take(10)
            ->map(fn (Investment $inv) => $this->transformInvestment($inv))
            ->values();

        $notifications = AppNotification::query()
            ->where('user_id', $userId)
            ->latest('created_at')
            ->limit(8)
            ->get()
            ->map(fn (AppNotification $n) => [
                'id' => $n->id,
                'title' => $n->title,
                'body' => $n->body,
                'type' => $n->type,
                'read_at' => $n->read_at?->toIso8601String(),
                'created_at' => $n->created_at?->toIso8601String(),
                'unread' => $n->read_at === null,
            ])
            ->values();

        $opportunities = InvestmentProject::query()
            ->whereIn('status', ContainerProjectStatus::investableStatuses())
            ->latest()
            ->limit(3)
            ->get()
            ->map(fn (InvestmentProject $p) => $this->transformOpportunity($p))
            ->values();

        $containerOpportunities = InvestmentProject::query()
            ->where('type', 'container')
            ->where(function ($q) {
                $q->whereNull('dashboard_module')
                    ->orWhere('dashboard_module', '!=', 'yellow_maize');
            })
            ->whereIn('status', ContainerProjectStatus::investableStatuses())
            ->latest()
            ->limit(3)
            ->get()
            ->map(fn (InvestmentProject $p) => $this->transformOpportunity($p))
            ->values();

        $platform = PlatformSetting::query()->first();
        $enabledModules = [];
        if ($platform?->invest_feeds_visible) {
            $enabledModules[] = 'feed';
        }
        if ($platform?->invest_ricemill_visible) {
            $enabledModules[] = 'ricemill';
        }
        if ($platform?->invest_yellow_maize_visible) {
            $enabledModules[] = 'yellow_maize';
        }

        $moduleOpportunities = collect();
        if ($enabledModules !== []) {
            $moduleRows = InvestmentProject::query()
                ->whereIn('dashboard_module', $enabledModules)
                ->whereIn('status', array_merge(
                    ContainerProjectStatus::investableStatuses(),
                    ['active', 'funding']
                ))
                ->orderByDesc('id')
                ->get();

            // One card per enabled module (prefer newest)
            $moduleOpportunities = collect($enabledModules)
                ->map(function (string $module) use ($moduleRows) {
                    $project = $moduleRows->firstWhere('dashboard_module', $module);

                    return $project ? $this->transformOpportunity($project) : null;
                })
                ->filter()
                ->values();
        }

        $pkrDisplayEnabled = PlatformSetting::pkrDisplayEnabled();
        $dualCurrencyEnabled = PlatformSetting::dualCurrencyEnabled();

        $profitMonthly = InvestorProfitTotals::monthlyBreakdown($userId, $user);
        $portfolioSeries = $this->buildPortfolioSeries($investments, $userId, $isPkrInvestor, $displayUsdRate);
        $allocation = $this->buildAllocation(
            $investments->whereIn('status', ['pending', 'active'])->values(),
            (float) $wallet->available_balance,
            $isPkrInvestor,
            $displayUsdRate,
        );
        $benchmarkSeries = $this->buildBenchmarkSeries($userId);
        $nextDistribution = $this->buildNextDistribution($investments, $isPkrInvestor, $displayUsdRate);

        $profitTotals = InvestorProfitTotals::profitEarned($userId, $user);
        $profitEarned = $profitTotals['wallet'];
        $profitEarnedUsd = $isPkrInvestor ? $profitTotals['usd'] : null;

        $currentMonthKey = now()->format('Y-m');
        $currentMonthRow = collect($profitMonthly)->firstWhere('month_key', $currentMonthKey);
        $monthlyProfit = (float) ($currentMonthRow['monthly'] ?? 0.0);
        $monthlyProfitUsd = $isPkrInvestor
            ? (float) ($currentMonthRow['monthly_usd'] ?? 0.0)
            : null;

        $totalInvestmentDisplayUsd = round($totalInvestedUsd, 2);
        $activeInvestmentDisplayUsd = round($activeInvestedUsd, 2);

        if ($isPkrInvestor && $displayUsdRate !== null && $displayUsdRate > 0) {
            // Aggregate bracket USD uses average deposit rate (or live fallback).
            $totalInvestmentDisplayUsd = InvestorDepositFx::pkrToUsd($totalInvested, $displayUsdRate);
            $activeInvestmentDisplayUsd = InvestorDepositFx::pkrToUsd($activeInvested, $displayUsdRate);
        }

        $portfolioSummary = InvestorProfitTotals::portfolioSummary(
            $investments,
            $wallet,
            $userId,
            $walletCurrency,
            $displayUsdRate,
        );

        return response()->json([
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'company_name' => $user->profile?->company_name,
                    'country' => $user->profile?->country,
                    'avatar_url' => $user->profile?->avatar_url,
                ],
                'wallet' => [
                    'id' => $wallet->id,
                    'currency' => $walletCurrency,
                    'available_balance' => (float) $wallet->available_balance,
                    'pending_balance' => (float) $wallet->pending_balance,
                ],
                'withdrawal_fee' => $withdrawalTerms['fee'],
                'withdrawal_fee_usd' => $withdrawalTerms['fee_usd'],
                'withdrawal_fee_currency' => $withdrawalTerms['fee_currency'],
                'minimum_withdrawal_amount' => $withdrawalTerms['minimum_withdrawal_amount'],
                'minimum_withdrawal_usd' => $withdrawalTerms['minimum_withdrawal_usd'],
                'minimum_withdrawal_currency' => $withdrawalTerms['minimum_withdrawal_currency'],
                'estimated_processing_time' => $withdrawalTerms['estimated_processing_time'],
                'fx' => [
                    'avg_deposit_usd_rate' => $avgDepositRate,
                    'display_usd_rate' => $displayUsdRate,
                    'pkr_display_enabled' => $pkrDisplayEnabled,
                    'dual_currency_enabled' => $dualCurrencyEnabled,
                ],
                'summary' => [
                    'total_investment' => round($totalInvested, 2),
                    'active_investment' => round($activeInvested, 2),
                    'total_investment_usd' => $totalInvestmentDisplayUsd,
                    'active_investment_usd' => $activeInvestmentDisplayUsd,
                    'total_portfolio_value' => $portfolioSummary['total_portfolio_value'],
                    'distributed_returns' => $portfolioSummary['distributed_returns'],
                    'pending_distribution' => $portfolioSummary['pending_distribution'],
                    'display_currency' => $portfolioSummary['display_currency'],
                    'active_investments_count' => $activeCount,
                    'investments_count' => $investments->count(),
                    'available_balance' => (float) $wallet->available_balance,
                    'total_profit_earned' => $profitEarned,
                    'total_profit_earned_usd' => $profitEarnedUsd,
                    'monthly_profit' => round($monthlyProfit, 2),
                    'monthly_profit_usd' => $monthlyProfitUsd !== null ? round($monthlyProfitUsd, 2) : null,
                    'lifetime_roi' => $totalInvested > 0
                        ? round(($profitEarned / $totalInvested) * 100, 2)
                        : 0.0,
                    'pending_withdrawals_amount' => $finance['pending_withdrawals_amount'],
                    'pending_withdrawals_amount_usd' => $finance['pending_withdrawals_amount_usd'],
                    'pending_withdrawals_count' => $finance['pending_withdrawals_count'],
                    'pending_deposits_amount' => $finance['pending_deposits_amount'],
                    'pending_deposits_count' => $finance['pending_deposits_count'],
                    'total_deposits' => $finance['total_deposits'],
                    'total_deposits_count' => $finance['total_deposits_count'],
                    'total_deposits_usd' => $finance['total_deposits_usd'],
                    'total_withdrawals' => $finance['total_withdrawals'],
                    'total_withdrawals_count' => $finance['total_withdrawals_count'],
                    'total_withdrawals_usd' => $finance['total_withdrawals_usd'],
                    'completed_transactions' => $completedTxCount,
                ],
                'kyc_status' => KycGate::status($user),
                'kyc_approved' => KycGate::isApproved($user),
                'portfolio_series' => $portfolioSeries,
                'benchmark_series' => $benchmarkSeries,
                'benchmark_available' => count($benchmarkSeries['points'] ?? []) > 0,
                'next_distribution' => $nextDistribution,
                'next_distribution_available' => $nextDistribution !== null,
                'profit_monthly' => $profitMonthly,
                'allocation' => $allocation,
                'my_investments' => $myInvestments,
                'recent_transactions' => $recentTransactions,
                'recent_deposits' => $recentDeposits,
                'withdrawals' => $withdrawals,
                'opportunities' => $opportunities,
                'container_opportunities' => $containerOpportunities,
                'module_opportunities' => $moduleOpportunities,
                'notifications' => $notifications,
                'notifications_unread' => AppNotification::query()
                    ->where('user_id', $userId)
                    ->whereNull('read_at')
                    ->count(),
            ],
        ]);
    }

    private function transformTransaction(WalletTransaction $tx): array
    {
        $type = match (strtolower((string) $tx->type)) {
            'deposit' => 'Deposit',
            'withdrawal' => 'Withdrawal',
            'investment' => 'Investment',
            'profit', 'distribution', 'dividend', 'investment_return' => 'Profit',
            'bonus' => 'Bonus',
            default => ucfirst((string) $tx->type),
        };

        $meta = is_array($tx->meta) ? $tx->meta : [];
        $reference = $tx->reference ?: 'TXN-'.$tx->id;
        // Prefer project/container reference over INV-{id} investment tags
        if (isset($meta['project_reference']) && filled($meta['project_reference'])) {
            $reference = (string) $meta['project_reference'];
        } elseif (is_string($reference) && preg_match('/^INV-\d+$/i', $reference)) {
            $reference = (string) ($meta['project_title'] ?? preg_replace('/^INV-/i', '', $reference));
        }

        return [
            'id' => $tx->id,
            'date' => $tx->created_at?->toDateString(),
            'date_label' => $tx->created_at?->format('M j, Y'),
            'reference' => $reference,
            'type' => $type,
            'direction' => $tx->direction,
            'method' => $meta['method'] ?? null,
            'amount' => (float) $tx->amount,
            'status' => $tx->status,
            'remark' => $meta['note'] ?? $meta['remark'] ?? null,
            'created_at' => $tx->created_at?->toIso8601String(),
        ];
    }

    private function transformWithdrawal(Withdrawal $w): array
    {
        $bank = is_array($w->bank_details) ? $w->bank_details : [];
        $bankLabel = $bank['bank_name']
            ?? $bank['bank']
            ?? $bank['account_name']
            ?? null;
        $account = $bank['account_number'] ?? $bank['iban'] ?? null;
        if ($account) {
            $masked = '****'.substr(preg_replace('/\s+/', '', (string) $account), -4);
            $bankLabel = trim(($bankLabel ?: 'Bank').' '.$masked);
        }

        return [
            'id' => $w->id,
            'date' => $w->created_at?->toDateString(),
            'date_label' => $w->created_at?->format('M j, Y'),
            'amount' => (float) $w->amount,
            'amount_usd' => $w->amount_usd !== null ? (float) $w->amount_usd : null,
            'exchange_rate' => $w->exchange_rate !== null ? (float) $w->exchange_rate : null,
            'bank' => $bankLabel,
            'status' => $w->status,
            'reference' => $w->reference,
            'note' => $w->note,
        ];
    }

    private function transformDeposit(Deposit $d): array
    {
        return [
            'id' => $d->id,
            'date' => $d->created_at?->toDateString(),
            'date_label' => $d->created_at?->format('M j, Y'),
            'amount' => (float) ($d->converted_amount ?? $d->amount),
            'original_amount' => (float) $d->amount,
            'original_currency' => $d->currency,
            'converted_amount' => $d->converted_amount !== null ? (float) $d->converted_amount : null,
            'exchange_rate' => $d->exchange_rate !== null ? (float) $d->exchange_rate : null,
            'amount_usd' => $d->amount_usd !== null ? (float) $d->amount_usd : null,
            'usd_exchange_rate' => $d->usd_exchange_rate !== null ? (float) $d->usd_exchange_rate : null,
            'currency' => $d->wallet_currency ?: $d->currency,
            'wallet_currency' => $d->wallet_currency,
            'method' => $d->method ?: ($d->bank_account_name ?: null),
            'status' => $d->status,
            'reference' => $d->reference ?: sprintf('OGDEP-INV-%03d', $d->id),
            'note' => $d->note,
        ];
    }

    private function transformInvestment(Investment $inv): array
    {
        $project = $inv->project;
        $investedAt = $inv->invested_at ? Carbon::parse($inv->invested_at) : null;
        $periodDays = (int) ($project?->investment_period_days ?: 0);
        $eta = $project?->eta ? Carbon::parse($project->eta) : null;
        $etd = $project?->etd ? Carbon::parse($project->etd) : null;

        $endDate = $eta;
        if (! $endDate && $investedAt && $periodDays > 0) {
            $endDate = $investedAt->copy()->addDays($periodDays);
        }

        $totalDays = $periodDays > 0
            ? $periodDays
            : ($investedAt && $endDate ? max(1, $investedAt->diffInDays($endDate)) : 0);

        $daysElapsed = 0;
        if ($investedAt) {
            $daysElapsed = min(
                $totalDays > 0 ? $totalDays : PHP_INT_MAX,
                max(0, $investedAt->diffInDays(now()))
            );
            if ($totalDays === 0) {
                $daysElapsed = max(0, $investedAt->diffInDays(now()));
            }
        }

        $roi = (float) ($project?->expected_return_pct ?: 0);
        $expectedProfit = round(((float) $inv->amount) * ($roi / 100), 2);
        $status = $this->mapInvestmentStatus(
            (string) $inv->status,
            (string) ($project?->status ?: ''),
            (string) ($project?->type ?: ''),
        );

        $type = match (strtolower((string) ($project?->type ?: ''))) {
            'container' => 'export',
            'produce' => 'export',
            'plant', 'cold_storage', 'ricemill', 'feed' => 'project',
            'domestic_trading' => 'import',
            default => strtolower((string) ($project?->type ?: 'export')) ?: 'export',
        };

        return [
            'id' => $inv->id,
            'plan' => $project?->title ?: 'Investment #'.$inv->id,
            'reference' => $project?->reference,
            'type' => $type,
            'project_type' => $project?->type,
            'commodity' => $project?->commodity ?: ($project?->variety ?: null),
            'container_no' => data_get($project?->meta, 'container_no')
                ?: data_get($project?->meta, 'container_number')
                ?: data_get($project?->meta, 'containerNumber'),
            'container_type' => $project?->container_type,
            'shipping_line' => $project?->shipping_line,
            'vessel' => $project?->vessel,
            'port_of_loading' => $project?->port_of_loading,
            'port_of_discharge' => $project?->port_of_discharge,
            'incoterm' => $project?->incoterm,
            'invest_date' => $investedAt?->toDateString(),
            'departure_date' => $etd?->toDateString(),
            'arrival_date' => $eta?->toDateString(),
            'total_days' => $totalDays,
            'days_elapsed' => $daysElapsed,
            'amount' => (float) $inv->amount,
            'amount_pkr' => $inv->amount_pkr != null ? (float) $inv->amount_pkr : null,
            'expected_profit' => $expectedProfit,
            'profit_amount' => $inv->profit_amount != null ? (float) $inv->profit_amount : null,
            'profit_amount_pkr' => $inv->profit_amount_pkr != null ? (float) $inv->profit_amount_pkr : null,
            'exchange_rate' => $inv->exchange_rate != null ? (float) $inv->exchange_rate : null,
            'amount_currency' => $inv->amount_currency,
            'roi' => $roi,
            'roi_label' => $project?->roi_label,
            'status' => $status,
            'investment_status' => $inv->status,
            'project_status' => $project?->status,
            'current_stage' => $project?->current_project_stage,
            'historical_returns' => $roi > 0 ? [$roi] : [],
        ];
    }

    private function transformOpportunity(InvestmentProject $p): array
    {
        $capacity = InvestmentCapacity::snapshot($p);

        $style = match (strtolower((string) ($p->dashboard_module ?: $p->type))) {
            'produce' => ['emoji' => '🌿', 'color' => 'text-emerald-600', 'bg' => 'bg-emerald-500/10', 'border' => 'border-emerald-500/20'],
            'plant' => ['emoji' => '🏭', 'color' => 'text-amber-600', 'bg' => 'bg-amber-500/10', 'border' => 'border-amber-500/20'],
            'ricemill' => ['emoji' => '🌾', 'color' => 'text-emerald-600', 'bg' => 'bg-emerald-500/10', 'border' => 'border-emerald-500/20'],
            'feed' => ['emoji' => '🐄', 'color' => 'text-amber-600', 'bg' => 'bg-amber-500/10', 'border' => 'border-amber-500/20'],
            'yellow_maize' => ['emoji' => '🌽', 'color' => 'text-yellow-600', 'bg' => 'bg-yellow-500/10', 'border' => 'border-yellow-500/20'],
            default => ['emoji' => '🚢', 'color' => 'text-blue-600', 'bg' => 'bg-blue-500/10', 'border' => 'border-blue-500/20'],
        };

        return [
            'id' => $p->id,
            'product' => $p->title,
            'type' => $p->type,
            'dashboard_module' => $p->dashboard_module,
            'container_type' => $p->container_type ?: ucfirst((string) $p->type),
            'roi' => (float) ($p->expected_return_pct ?: 0),
            'amount' => (float) ($p->min_investment ?: 0),
            'slots' => $capacity['slots_remaining'],
            'remaining_amount' => $capacity['remaining_capacity'],
            'pending_reserved' => $capacity['pending_reserved'],
            'is_full' => $capacity['is_full'],
            'emoji' => $style['emoji'],
            'color' => $style['color'],
            'bg' => $style['bg'],
            'border' => $style['border'],
            'status' => $p->status,
        ];
    }

    private function mapInvestmentStatus(string $investmentStatus, string $projectStatus, string $projectType = ''): string
    {
        if ($investmentStatus === 'cancelled') {
            return 'cancelled';
        }
        if ($investmentStatus === 'completed' || $projectStatus === 'completed' || $projectStatus === 'settled') {
            return 'completed';
        }
        if ($projectStatus === 'shipping' || $projectStatus === 'in_transit') {
            return 'in_transit';
        }
        if ($projectStatus === 'custom_clearance') {
            return 'customs';
        }
        if ($investmentStatus === 'pending') {
            if (strtolower($projectType) === 'container') {
                return 'funding';
            }

            return 'pending';
        }
        if ($investmentStatus === 'active') {
            return 'active';
        }

        return $investmentStatus ?: 'active';
    }

    /**
     * Event-based portfolio timeline: invest adds principal, complete removes it and adds profit.
     *
     * @param  Collection<int, Investment>  $investments
     * @return array{points: list<array{date: string, date_label: string, value: float, profit: float}>}
     */
    private function buildPortfolioSeries(
        Collection $investments,
        int $userId,
        bool $isPkr = false,
        ?float $displayRate = null,
    ): array {
        $events = [];

        foreach ($investments as $inv) {
            $eventAt = $inv->invested_at ?? $inv->created_at;
            if ($eventAt === null) {
                continue;
            }
            $at = Carbon::parse($eventAt);
            $events[] = [
                'at' => $at,
                'type' => 'invest',
                'amount' => InvestorProfitTotals::investmentToWallet($inv, $isPkr, $displayRate),
                'profit' => 0.0,
                'investment_id' => $inv->id,
            ];
        }

        $distributions = InvestmentProfitDistribution::query()
            ->where('investor_id', $userId)
            ->get(['investment_id', 'invested_amount', 'invested_amount_pkr', 'profit_amount', 'profit_amount_pkr', 'distributed_at']);

        foreach ($distributions as $dist) {
            $at = $dist->distributed_at
                ? Carbon::parse($dist->distributed_at)
                : null;
            if (! $at) {
                continue;
            }
            $investedWallet = $isPkr
                ? ($dist->invested_amount_pkr !== null
                    ? (float) $dist->invested_amount_pkr
                    : InvestorProfitTotals::usdToPkr((float) $dist->invested_amount, $displayRate))
                : (float) $dist->invested_amount;
            $events[] = [
                'at' => $at,
                'type' => 'complete',
                'amount' => $investedWallet,
                'profit' => InvestorProfitTotals::distributionToWallet($dist, $isPkr, $displayRate),
                'investment_id' => $dist->investment_id,
            ];
        }

        if ($events === []) {
            return ['points' => []];
        }

        usort($events, function (array $a, array $b) {
            $cmp = $a['at']->timestamp <=> $b['at']->timestamp;
            if ($cmp !== 0) {
                return $cmp;
            }
            // Invest before complete on same timestamp
            if ($a['type'] === $b['type']) {
                return 0;
            }

            return $a['type'] === 'invest' ? -1 : 1;
        });

        $activePrincipal = 0.0;
        $cumulativeProfit = 0.0;
        $points = [];

        // Zero baseline the day before the first event so the chart steps up on invest day.
        $firstAt = $events[0]['at']->copy()->startOfDay();
        $baselineAt = $firstAt->copy()->subDay();
        $points[] = [
            'date' => $baselineAt->toDateString(),
            'date_label' => $baselineAt->format('M j, Y'),
            'value' => 0.0,
            'profit' => 0.0,
        ];

        foreach ($events as $event) {
            if ($event['type'] === 'invest') {
                $activePrincipal += $event['amount'];
            } else {
                $activePrincipal = max(0.0, $activePrincipal - $event['amount']);
                $cumulativeProfit += $event['profit'];
            }

            $at = $event['at'];
            $points[] = [
                'date' => $at->toDateString(),
                'date_label' => $at->format('M j, Y'),
                'value' => round($activePrincipal + $cumulativeProfit, 2),
                'profit' => round($cumulativeProfit, 2),
            ];
        }

        // Add a "today" point so range filters show current state.
        $today = now()->startOfDay();
        $last = end($points);
        if ($last && Carbon::parse($last['date'])->lt($today)) {
            $points[] = [
                'date' => $today->toDateString(),
                'date_label' => $today->format('M j, Y'),
                'value' => $last['value'],
                'profit' => $last['profit'],
            ];
        }

        return ['points' => $this->densifyPortfolioPoints(array_values($points))];
    }

    /**
     * Fill daily carry-forward points between event dates (capped) for stable chart segments.
     *
     * @param  list<array{date: string, date_label: string, value: float, profit: float}>  $points
     * @return list<array{date: string, date_label: string, value: float, profit: float}>
     */
    private function densifyPortfolioPoints(array $points): array
    {
        if (count($points) < 2) {
            return $points;
        }

        // Keep last point per date (later events overwrite earlier same-day values).
        $byDate = [];
        foreach ($points as $point) {
            $byDate[$point['date']] = $point;
        }
        ksort($byDate);
        $keyed = array_values($byDate);

        $start = Carbon::parse($keyed[0]['date'])->startOfDay();
        $end = Carbon::parse($keyed[count($keyed) - 1]['date'])->startOfDay();
        $spanDays = $start->diffInDays($end);

        // Cap densification to avoid huge payloads for long histories.
        if ($spanDays > 366) {
            $start = $end->copy()->subDays(366);
            $keyed = array_values(array_filter(
                $keyed,
                fn (array $p) => Carbon::parse($p['date'])->gte($start)
            ));
            if ($keyed === []) {
                return $points;
            }
            // Carry last known value from before the window into the new start.
            $prior = null;
            foreach ($byDate as $date => $point) {
                if (Carbon::parse($date)->lt($start)) {
                    $prior = $point;
                } else {
                    break;
                }
            }
            if ($prior !== null && ($keyed[0]['date'] ?? null) !== $start->toDateString()) {
                array_unshift($keyed, [
                    'date' => $start->toDateString(),
                    'date_label' => $start->format('M j, Y'),
                    'value' => $prior['value'],
                    'profit' => $prior['profit'],
                ]);
            }
            $start = Carbon::parse($keyed[0]['date'])->startOfDay();
        }

        $lookup = [];
        foreach ($keyed as $point) {
            $lookup[$point['date']] = $point;
        }

        $dense = [];
        $cursor = $start->copy();
        $lastValue = $keyed[0]['value'];
        $lastProfit = $keyed[0]['profit'];
        $endDay = Carbon::parse($keyed[count($keyed) - 1]['date'])->startOfDay();

        while ($cursor->lte($endDay)) {
            $key = $cursor->toDateString();
            if (isset($lookup[$key])) {
                $lastValue = $lookup[$key]['value'];
                $lastProfit = $lookup[$key]['profit'];
            }
            $dense[] = [
                'date' => $key,
                'date_label' => $cursor->format('M j, Y'),
                'value' => $lastValue,
                'profit' => $lastProfit,
            ];
            $cursor->addDay();
        }

        return $dense;
    }

    /**
     * 12-month ROI comparison: investor cumulative ROI vs platform average ROI.
     *
     * @return array{points: list<array{month: string, month_key: string, portfolio_roi: float, market_roi: float}>}
     */
    private function buildBenchmarkSeries(int $userId): array
    {
        $months = [];
        for ($i = 11; $i >= 0; $i--) {
            $at = now()->startOfMonth()->subMonths($i);
            $months[] = $at->format('Y-m');
        }

        $investorDists = InvestmentProfitDistribution::query()
            ->where('investor_id', $userId)
            ->whereNotNull('distributed_at')
            ->orderBy('distributed_at')
            ->get(['invested_amount', 'profit_amount', 'distributed_at']);

        $platformDists = InvestmentProfitDistribution::query()
            ->whereNotNull('distributed_at')
            ->orderBy('distributed_at')
            ->get(['roi_pct', 'distributed_at']);

        if ($investorDists->isEmpty() && $platformDists->isEmpty()) {
            return ['points' => []];
        }

        $points = [];
        foreach ($months as $monthKey) {
            $monthEnd = Carbon::createFromFormat('Y-m', $monthKey)->endOfMonth();

            $invUpTo = $investorDists->filter(
                fn ($d) => Carbon::parse($d->distributed_at)->lte($monthEnd)
            );
            $invInvested = (float) $invUpTo->sum('invested_amount');
            $invProfit = (float) $invUpTo->sum('profit_amount');
            $portfolioRoi = $invInvested > 0
                ? round(($invProfit / $invInvested) * 100, 2)
                : 0.0;

            $platUpTo = $platformDists->filter(
                fn ($d) => Carbon::parse($d->distributed_at)->lte($monthEnd)
            );
            $marketRoi = $platUpTo->isEmpty()
                ? 0.0
                : round((float) $platUpTo->avg('roi_pct'), 2);

            $points[] = [
                'month' => Carbon::createFromFormat('Y-m', $monthKey)->format('M Y'),
                'month_key' => $monthKey,
                'portfolio_roi' => $portfolioRoi,
                'market_roi' => $marketRoi,
            ];
        }

        // Only expose series when at least one real distribution exists.
        $hasData = $investorDists->isNotEmpty() || $platformDists->isNotEmpty();

        return ['points' => $hasData ? $points : []];
    }

    /**
     * Nearest upcoming distribution from active/pending investments.
     *
     * @param  Collection<int, Investment>  $investments
     * @return array{progress_pct: float, expected_date: string, expected_date_label: string, expected_payout: float, label: string}|null
     */
    private function buildNextDistribution(
        Collection $investments,
        bool $isPkr = false,
        ?float $displayRate = null,
    ): ?array {
        $candidates = [];

        foreach ($investments->whereIn('status', ['pending', 'active']) as $inv) {
            $project = $inv->project;
            $investedAt = $inv->invested_at ? Carbon::parse($inv->invested_at) : null;
            $periodDays = (int) ($project?->investment_period_days ?: 0);
            $eta = $project?->eta ? Carbon::parse($project->eta) : null;

            $endDate = $eta;
            if (! $endDate && $investedAt && $periodDays > 0) {
                $endDate = $investedAt->copy()->addDays($periodDays);
            }
            if (! $endDate) {
                continue;
            }

            $roi = (float) ($project?->expected_return_pct ?: 0);
            $amount = InvestorProfitTotals::investmentToWallet($inv, $isPkr, $displayRate);
            $expectedProfit = round($amount * ($roi / 100), 2);

            $totalDays = $periodDays > 0
                ? $periodDays
                : ($investedAt ? max(1, $investedAt->diffInDays($endDate)) : 0);

            $daysElapsed = 0;
            if ($investedAt && $totalDays > 0) {
                $daysElapsed = min($totalDays, max(0, $investedAt->diffInDays(now())));
            }
            $progressPct = $totalDays > 0
                ? round(min(100, ($daysElapsed / $totalDays) * 100), 1)
                : 0.0;

            $candidates[] = [
                'end' => $endDate,
                'progress_pct' => $progressPct,
                'expected_date' => $endDate->toDateString(),
                'expected_date_label' => $endDate->format('M j, Y'),
                'expected_payout' => round($amount + $expectedProfit, 2),
                'label' => $project?->title ?: 'Investment #'.$inv->id,
            ];
        }

        if ($candidates === []) {
            return null;
        }

        usort($candidates, fn ($a, $b) => $a['end']->timestamp <=> $b['end']->timestamp);
        $nearest = $candidates[0];
        unset($nearest['end']);

        return $nearest;
    }

    /**
     * @param  Collection<int, Investment>  $investments
     * @return list<array{name: string, value: float, color: string, amount: float}>
     */
    private function buildAllocation(
        Collection $investments,
        float $availableBalance,
        bool $isPkr = false,
        ?float $displayRate = null,
    ): array {
        $byType = $investments
            ->groupBy(fn (Investment $inv) => strtolower((string) ($inv->project?->type ?: 'other')))
            ->map(fn (Collection $group) => (float) $group->sum(
                fn (Investment $inv) => InvestorProfitTotals::investmentToWallet($inv, $isPkr, $displayRate)
            ));

        $total = (float) $byType->sum() + max(0, $availableBalance);
        if ($total <= 0) {
            return [];
        }

        $labels = [
            'container' => 'Export Containers',
            'produce' => 'Fresh Produce',
            'plant' => 'Long-Term Projects',
            'ricemill' => 'Rice Mill',
            'feed' => 'Feed Mill',
            'cold_storage' => 'Cold Storage',
            'domestic_trading' => 'Domestic Trading',
            'other' => 'Other',
        ];

        $items = [];
        foreach ($byType as $type => $amount) {
            if ($amount <= 0) {
                continue;
            }
            $items[] = [
                'name' => $labels[$type] ?? ucfirst((string) $type),
                'value' => round(($amount / $total) * 100, 1),
                'amount' => round($amount, 2),
                'color' => self::ALLOCATION_COLORS[$type] ?? self::ALLOCATION_COLORS['other'],
            ];
        }

        if ($availableBalance > 0) {
            $items[] = [
                'name' => 'Available Balance',
                'value' => round(($availableBalance / $total) * 100, 1),
                'amount' => round($availableBalance, 2),
                'color' => self::ALLOCATION_COLORS['available'],
            ];
        }

        return $items;
    }
}
