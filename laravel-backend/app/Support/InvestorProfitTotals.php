<?php

namespace App\Support;

use App\Models\Investment;
use App\Models\InvestmentProfitDistribution;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class InvestorProfitTotals
{
    public const WALLET_PROFIT_TYPES = ['profit', 'bonus', 'distribution', 'dividend'];

    /**
     * @return array{
     *   wallet: float,
     *   usd: float,
     *   is_pkr: bool,
     *   display_rate: float|null
     * }
     */
    public static function profitEarned(int $userId, ?User $user = null, ?Carbon $monthStart = null, ?Carbon $monthEnd = null): array
    {
        $user ??= User::query()->with(['profile', 'wallet'])->find($userId);
        $isPkr = $user ? UserDisplayCurrency::isPkrUser($user) : false;
        $displayRate = $isPkr ? InvestorDepositFx::resolveDisplayRate($userId) : null;

        $distributions = InvestmentProfitDistribution::query()
            ->where('investor_id', $userId)
            ->when($monthStart, fn ($q) => $q->where('distributed_at', '>=', $monthStart))
            ->when($monthEnd, fn ($q) => $q->where('distributed_at', '<=', $monthEnd))
            ->get(['profit_amount', 'profit_amount_pkr', 'distributed_at']);

        $wallet = Wallet::query()->where('user_id', $userId)->first();
        $walletRows = collect();
        if ($wallet) {
            $walletRows = WalletTransaction::query()
                ->where('wallet_id', $wallet->id)
                ->where('direction', 'credit')
                ->whereIn('type', self::WALLET_PROFIT_TYPES)
                ->when($monthStart, fn ($q) => $q->where('created_at', '>=', $monthStart))
                ->when($monthEnd, fn ($q) => $q->where('created_at', '<=', $monthEnd))
                ->get(['amount', 'created_at']);
        }

        $distributionWallet = 0.0;
        $distributionUsd = 0.0;
        foreach ($distributions as $dist) {
            $usd = (float) $dist->profit_amount;
            $distributionUsd += $usd;
            $distributionWallet += self::distributionToWallet($dist, $isPkr, $displayRate);
        }

        $walletProfit = (float) $walletRows->sum('amount');
        $walletUsd = 0.0;
        if ($isPkr && $displayRate !== null && $displayRate > 0) {
            $walletUsd = InvestorDepositFx::pkrToUsd($walletProfit, $displayRate);
        } else {
            $walletUsd = $walletProfit;
        }

        return [
            'wallet' => round($distributionWallet + $walletProfit, 2),
            'usd' => round($distributionUsd + $walletUsd, 2),
            'is_pkr' => $isPkr,
            'display_rate' => $displayRate,
        ];
    }

    /**
     * Monthly profit breakdown in wallet currency.
     *
     * @return list<array{month: string, month_key: string, monthly: float, monthly_usd: float}>
     */
    public static function monthlyBreakdown(int $userId, ?User $user = null): array
    {
        $user ??= User::query()->with(['profile', 'wallet'])->find($userId);
        $isPkr = $user ? UserDisplayCurrency::isPkrUser($user) : false;
        $displayRate = $isPkr ? InvestorDepositFx::resolveDisplayRate($userId) : null;

        /** @var array<string, array{wallet: float, usd: float}> $byMonth */
        $byMonth = [];

        $wallet = Wallet::query()->where('user_id', $userId)->first();
        if ($wallet) {
            $walletRows = WalletTransaction::query()
                ->where('wallet_id', $wallet->id)
                ->where('direction', 'credit')
                ->whereIn('type', self::WALLET_PROFIT_TYPES)
                ->where('status', 'completed')
                ->get(['amount', 'created_at']);

            foreach ($walletRows as $tx) {
                if (! $tx->created_at) {
                    continue;
                }
                $key = $tx->created_at->format('Y-m');
                $amount = (float) $tx->amount;
                $byMonth[$key] ??= ['wallet' => 0.0, 'usd' => 0.0];
                $byMonth[$key]['wallet'] += $amount;
                if ($isPkr && $displayRate !== null && $displayRate > 0) {
                    $byMonth[$key]['usd'] += $amount / $displayRate;
                } else {
                    $byMonth[$key]['usd'] += $amount;
                }
            }
        }

        $distributions = InvestmentProfitDistribution::query()
            ->where('investor_id', $userId)
            ->whereNotNull('distributed_at')
            ->get(['profit_amount', 'profit_amount_pkr', 'distributed_at']);

        foreach ($distributions as $dist) {
            $key = Carbon::parse($dist->distributed_at)->format('Y-m');
            $byMonth[$key] ??= ['wallet' => 0.0, 'usd' => 0.0];
            $byMonth[$key]['wallet'] += self::distributionToWallet($dist, $isPkr, $displayRate);
            $byMonth[$key]['usd'] += (float) $dist->profit_amount;
        }

        if ($byMonth === []) {
            return [];
        }

        ksort($byMonth);

        $result = [];
        foreach ($byMonth as $key => $amounts) {
            $at = Carbon::createFromFormat('Y-m', $key);
            $result[] = [
                'month' => $at->format('M'),
                'month_key' => $key,
                'monthly' => round((float) $amounts['wallet'], 2),
                'monthly_usd' => round((float) $amounts['usd'], 2),
            ];
        }

        return $result;
    }

    /**
     * Convert a distribution row to the investor's wallet display currency.
     */
    public static function distributionToWallet(
        InvestmentProfitDistribution $dist,
        bool $isPkr,
        ?float $displayRate = null,
    ): float {
        if (! $isPkr) {
            return (float) $dist->profit_amount;
        }

        if ($dist->profit_amount_pkr !== null) {
            return (float) $dist->profit_amount_pkr;
        }

        return self::usdToPkr((float) $dist->profit_amount, $displayRate);
    }

    /**
     * Investment principal in wallet currency (PKR prefers amount_pkr).
     */
    public static function investmentToWallet(Investment $inv, bool $isPkr, ?float $displayRate = null): float
    {
        if (! $isPkr) {
            return (float) $inv->amount;
        }

        if ($inv->amount_pkr !== null) {
            return (float) $inv->amount_pkr;
        }

        return self::usdToPkr((float) $inv->amount, $displayRate);
    }

    /**
     * @param  Collection<int, Investment>  $investments
     */
    public static function sumInvestedWallet(Collection $investments, bool $isPkr, ?float $displayRate = null): float
    {
        return round((float) $investments->sum(
            fn (Investment $inv) => self::investmentToWallet($inv, $isPkr, $displayRate)
        ), 2);
    }

    public static function usdToPkr(float $usd, ?float $displayRate = null): float
    {
        if ($displayRate !== null && $displayRate > 0) {
            return round($usd * $displayRate, 2);
        }

        try {
            return (float) ExchangeRateService::convert($usd, 'USD', 'PKR')['amount'];
        } catch (\Throwable) {
            $fallback = (float) (config('currency.fallback_rates.PKR') ?: 278.5);

            return round($usd * $fallback, 2);
        }
    }
}
