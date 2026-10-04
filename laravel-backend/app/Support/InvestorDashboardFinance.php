<?php

namespace App\Support;

use App\Models\Deposit;
use App\Models\Withdrawal;
use Illuminate\Support\Collection;

/**
 * Investor-scoped deposit / withdrawal totals for the investment dashboard cards.
 */
class InvestorDashboardFinance
{
    /** @var list<string> */
    public const PENDING_DEPOSIT_STATUSES = ['pending'];

    /** @var list<string> */
    public const APPROVED_DEPOSIT_STATUSES = ['approved', 'completed'];

    /** @var list<string> */
    public const PENDING_WITHDRAWAL_STATUSES = ['pending', 'review'];

    /** @var list<string> */
    public const APPROVED_WITHDRAWAL_STATUSES = ['approved', 'completed', 'paid'];

    /**
     * @return array{
     *     pending_deposits_amount: float,
     *     pending_deposits_count: int,
     *     total_deposits: float,
     *     total_deposits_count: int,
     *     total_deposits_usd: float|null,
     *     pending_withdrawals_amount: float,
     *     pending_withdrawals_count: int,
     *     pending_withdrawals_amount_usd: float|null,
     *     total_withdrawals: float,
     *     total_withdrawals_count: int,
     *     total_withdrawals_usd: float|null
     * }
     */
    public static function forInvestor(int $investorId, string $walletCurrency, bool $isPkrInvestor = false, ?float $displayUsdRate = null): array
    {
        $walletCurrency = strtoupper($walletCurrency);

        $pendingDeposits = Deposit::query()
            ->where('investor_id', $investorId)
            ->whereIn('status', self::PENDING_DEPOSIT_STATUSES)
            ->get(['id', 'amount', 'currency', 'status', 'converted_amount', 'wallet_currency']);

        $approvedDeposits = Deposit::query()
            ->where('investor_id', $investorId)
            ->whereIn('status', self::APPROVED_DEPOSIT_STATUSES)
            ->get(['amount', 'currency', 'converted_amount', 'wallet_currency', 'amount_usd']);

        $pendingWithdrawals = Withdrawal::query()
            ->where('investor_id', $investorId)
            ->whereIn('status', self::PENDING_WITHDRAWAL_STATUSES)
            ->get(['id', 'amount', 'amount_usd', 'exchange_rate', 'status']);

        $approvedWithdrawals = Withdrawal::query()
            ->where('investor_id', $investorId)
            ->whereIn('status', self::APPROVED_WITHDRAWAL_STATUSES)
            ->get(['id', 'amount', 'amount_usd', 'exchange_rate', 'status']);

        $pendingDepositsAmount = round((float) $pendingDeposits->sum(
            fn (Deposit $deposit) => self::depositToWallet($deposit, $walletCurrency)
        ), 2);

        $totalDepositsAmount = round((float) $approvedDeposits->sum(
            fn (Deposit $deposit) => self::depositToWallet($deposit, $walletCurrency)
        ), 2);

        $pendingWithdrawalsAmount = round((float) $pendingWithdrawals->sum(
            fn (Withdrawal $w) => (float) $w->amount
        ), 2);

        $totalWithdrawalsAmount = round((float) $approvedWithdrawals->sum(
            fn (Withdrawal $w) => (float) $w->amount
        ), 2);

        $pendingWithdrawalsUsd = self::withdrawalsUsdSum($pendingWithdrawals, $walletCurrency, $isPkrInvestor, $displayUsdRate);
        $totalWithdrawalsUsd = self::withdrawalsUsdSum($approvedWithdrawals, $walletCurrency, $isPkrInvestor, $displayUsdRate);

        $totalDepositsUsd = null;
        if ($isPkrInvestor && $displayUsdRate !== null && $displayUsdRate > 0) {
            $totalDepositsUsd = InvestorDepositFx::pkrToUsd($totalDepositsAmount, $displayUsdRate);
        }

        return [
            'pending_deposits_amount' => $pendingDepositsAmount,
            'pending_deposits_count' => $pendingDeposits->count(),
            'total_deposits' => $totalDepositsAmount,
            'total_deposits_count' => $approvedDeposits->count(),
            'total_deposits_usd' => $totalDepositsUsd,
            'pending_withdrawals_amount' => $pendingWithdrawalsAmount,
            'pending_withdrawals_count' => $pendingWithdrawals->count(),
            'pending_withdrawals_amount_usd' => $pendingWithdrawalsUsd,
            'total_withdrawals' => $totalWithdrawalsAmount,
            'total_withdrawals_count' => $approvedWithdrawals->count(),
            'total_withdrawals_usd' => $totalWithdrawalsUsd,
        ];
    }

    private static function depositToWallet(Deposit $deposit, string $walletCurrency): float
    {
        if ($deposit->converted_amount !== null
            && strtoupper((string) ($deposit->wallet_currency ?: '')) === $walletCurrency
        ) {
            return (float) $deposit->converted_amount;
        }

        $depositCurrency = strtoupper($deposit->currency ?: 'USD');

        try {
            return (float) ExchangeRateService::convert(
                (float) $deposit->amount,
                $depositCurrency,
                $walletCurrency
            )['amount'];
        } catch (\Throwable) {
            return (float) $deposit->amount;
        }
    }

    /**
     * @param  Collection<int, Withdrawal>  $withdrawals
     */
    private static function withdrawalsUsdSum(
        Collection $withdrawals,
        string $walletCurrency,
        bool $isPkrInvestor,
        ?float $displayUsdRate,
    ): ?float {
        if ($withdrawals->isEmpty()) {
            if ($isPkrInvestor) {
                return 0.0;
            }

            return $walletCurrency === 'USD' ? 0.0 : null;
        }

        $sum = 0.0;
        $hasUsd = false;

        foreach ($withdrawals as $withdrawal) {
            $usd = self::withdrawalToUsd($withdrawal, $walletCurrency, $isPkrInvestor, $displayUsdRate);
            if ($usd !== null) {
                $sum += $usd;
                $hasUsd = true;
            }
        }

        if (! $hasUsd) {
            return null;
        }

        return round($sum, 2);
    }

    private static function withdrawalToUsd(
        Withdrawal $withdrawal,
        string $walletCurrency,
        bool $isPkrInvestor,
        ?float $displayUsdRate,
    ): ?float {
        if ($withdrawal->amount_usd !== null) {
            return (float) $withdrawal->amount_usd;
        }

        $amount = (float) $withdrawal->amount;

        if ($walletCurrency === 'USD' || ! $isPkrInvestor) {
            return $amount;
        }

        $rate = $withdrawal->exchange_rate !== null ? (float) $withdrawal->exchange_rate : null;
        if ($rate !== null && $rate > 0) {
            return round($amount / $rate, 2);
        }

        if ($displayUsdRate !== null && $displayUsdRate > 0) {
            return InvestorDepositFx::pkrToUsd($amount, $displayUsdRate);
        }

        return null;
    }
}
