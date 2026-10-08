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
        $walletCurrency = $user ? UserDisplayCurrency::currencyForUser($user) : 'USD';
        $isPkr = $walletCurrency === 'PKR';
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
                ->get(['amount', 'created_at', 'meta']);
        }

        $distributionWallet = 0.0;
        $distributionUsd = 0.0;
        foreach ($distributions as $dist) {
            $usd = (float) $dist->profit_amount;
            $distributionUsd += $usd;
            $distributionWallet += self::distributionToWallet($dist, $walletCurrency, $displayRate);
        }

        $walletProfit = 0.0;
        $walletUsd = 0.0;
        foreach ($walletRows as $row) {
            $meta = is_array($row->meta) ? $row->meta : [];
            $sourceCurrency = strtoupper((string) ($meta['currency'] ?? $walletCurrency));
            $amount = (float) $row->amount;
            $walletProfit += self::convertToCurrency($amount, $sourceCurrency, $walletCurrency);
            $walletUsd += self::convertToCurrency($amount, $sourceCurrency, 'USD');
        }

        return [
            'wallet' => round($distributionWallet + $walletProfit, 2),
            'usd' => round($distributionUsd + $walletUsd, 2),
            'is_pkr' => $isPkr,
            'display_rate' => $displayRate,
        ];
    }

    /**
     * Build current portfolio values using only held investments, wallet balances,
     * confirmed distribution rows, and explicitly pending distribution credits.
     *
     * @param  Collection<int, Investment>  $investments
     * @return array{
     *   total_portfolio_value: float,
     *   distributed_returns: float,
     *   pending_distribution: float,
     *   display_currency: string
     * }
     */
    public static function portfolioSummary(
        Collection $investments,
        Wallet $wallet,
        int $userId,
        string $displayCurrency,
        ?float $displayRate = null,
    ): array {
        $displayCurrency = strtoupper($displayCurrency);

        $currentInvestmentValue = (float) $investments
            ->whereIn('status', ['pending', 'active'])
            ->sum(fn (Investment $investment) => self::investmentToWallet($investment, $displayCurrency, $displayRate));
        $walletValue = (float) $wallet->available_balance + (float) $wallet->pending_balance;

        $confirmedDistributions = InvestmentProfitDistribution::query()
            ->where('investor_id', $userId)
            ->whereNotNull('distributed_at')
            ->get(['profit_amount', 'profit_amount_pkr']);

        $distributedReturns = (float) $confirmedDistributions
            ->sum(fn (InvestmentProfitDistribution $distribution) => self::distributionToWallet(
                $distribution,
                $displayCurrency,
                $displayRate,
            ));

        // Pending return credits are explicit ledger entries. Forecasts and
        // investment_return rows are excluded because they are not profit-only payouts.
        $pendingDistribution = WalletTransaction::query()
            ->where('wallet_id', $wallet->id)
            ->where('direction', 'credit')
            ->where('status', 'pending')
            ->whereIn('type', ['profit', 'distribution', 'dividend'])
            ->get(['amount', 'meta'])
            ->sum(function (WalletTransaction $transaction) use ($displayCurrency): float {
                $meta = is_array($transaction->meta) ? $transaction->meta : [];

                return self::convertToCurrency(
                    (float) $transaction->amount,
                    strtoupper((string) ($meta['currency'] ?? $displayCurrency)),
                    $displayCurrency,
                );
            });

        return [
            'total_portfolio_value' => round($currentInvestmentValue + $walletValue + $pendingDistribution, 2),
            'distributed_returns' => round($distributedReturns, 2),
            'pending_distribution' => round($pendingDistribution, 2),
            'display_currency' => $displayCurrency,
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
        $walletCurrency = $user ? UserDisplayCurrency::currencyForUser($user) : 'USD';
        $displayRate = $walletCurrency === 'PKR' ? InvestorDepositFx::resolveDisplayRate($userId) : null;

        /** @var array<string, array{wallet: float, usd: float}> $byMonth */
        $byMonth = [];

        $wallet = Wallet::query()->where('user_id', $userId)->first();
        if ($wallet) {
            $walletRows = WalletTransaction::query()
                ->where('wallet_id', $wallet->id)
                ->where('direction', 'credit')
                ->whereIn('type', self::WALLET_PROFIT_TYPES)
                ->where('status', 'completed')
                ->get(['amount', 'created_at', 'meta']);

            foreach ($walletRows as $tx) {
                if (! $tx->created_at) {
                    continue;
                }
                $key = $tx->created_at->format('Y-m');
                $amount = (float) $tx->amount;
                $meta = is_array($tx->meta) ? $tx->meta : [];
                $sourceCurrency = strtoupper((string) ($meta['currency'] ?? $walletCurrency));
                $byMonth[$key] ??= ['wallet' => 0.0, 'usd' => 0.0];
                $byMonth[$key]['wallet'] += self::convertToCurrency($amount, $sourceCurrency, $walletCurrency);
                $byMonth[$key]['usd'] += self::convertToCurrency($amount, $sourceCurrency, 'USD');
            }
        }

        $distributions = InvestmentProfitDistribution::query()
            ->where('investor_id', $userId)
            ->whereNotNull('distributed_at')
            ->get(['profit_amount', 'profit_amount_pkr', 'distributed_at']);

        foreach ($distributions as $dist) {
            $key = Carbon::parse($dist->distributed_at)->format('Y-m');
            $byMonth[$key] ??= ['wallet' => 0.0, 'usd' => 0.0];
            $byMonth[$key]['wallet'] += self::distributionToWallet($dist, $walletCurrency, $displayRate);
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
        bool|string $displayCurrency,
        ?float $displayRate = null,
    ): float {
        $displayCurrency = self::normalizeCurrency($displayCurrency);

        if ($displayCurrency === 'PKR' && $dist->profit_amount_pkr !== null) {
            return (float) $dist->profit_amount_pkr;
        }

        return self::convertToCurrency((float) $dist->profit_amount, 'USD', $displayCurrency);
    }

    /**
     * Investment principal in wallet currency (PKR prefers amount_pkr).
     */
    public static function investmentToWallet(Investment $inv, bool|string $displayCurrency, ?float $displayRate = null): float
    {
        $displayCurrency = self::normalizeCurrency($displayCurrency);

        if ($displayCurrency === 'PKR' && $inv->amount_pkr !== null) {
            return (float) $inv->amount_pkr;
        }

        return self::convertToCurrency(
            (float) $inv->amount,
            strtoupper((string) ($inv->amount_currency ?: 'USD')),
            $displayCurrency,
        );
    }

    /**
     * @param  Collection<int, Investment>  $investments
     */
    public static function sumInvestedWallet(Collection $investments, bool|string $displayCurrency, ?float $displayRate = null): float
    {
        return round((float) $investments->sum(
            fn (Investment $inv) => self::investmentToWallet($inv, $displayCurrency, $displayRate)
        ), 2);
    }

    /**
     * @param  Collection<int, Investment>  $investments
     */
    public static function sumInvestedUsd(Collection $investments): float
    {
        return round((float) $investments->sum(
            fn (Investment $investment) => self::convertToCurrency(
                (float) $investment->amount,
                strtoupper((string) ($investment->amount_currency ?: 'USD')),
                'USD',
            )
        ), 2);
    }

    private static function normalizeCurrency(bool|string $currency): string
    {
        if (is_bool($currency)) {
            return $currency ? 'PKR' : 'USD';
        }

        $currency = strtoupper(trim($currency));

        return preg_match('/^[A-Z]{3}$/', $currency) ? $currency : 'USD';
    }

    public static function convertToCurrency(float $amount, string $sourceCurrency, string $targetCurrency): float
    {
        $sourceCurrency = strtoupper(trim($sourceCurrency));
        $targetCurrency = strtoupper(trim($targetCurrency));
        if (abs($amount) < 0.0001 || $sourceCurrency === $targetCurrency) {
            return round($amount, 2);
        }

        return (float) ExchangeRateService::convert($amount, $sourceCurrency, $targetCurrency)['amount'];
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
