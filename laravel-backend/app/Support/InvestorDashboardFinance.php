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
            ->get(['id', 'amount', 'amount_usd', 'exchange_rate', 'status', 'bank_details']);

        $approvedWithdrawals = Withdrawal::query()
            ->where('investor_id', $investorId)
            ->whereIn('status', self::APPROVED_WITHDRAWAL_STATUSES)
            ->get(['id', 'amount', 'amount_usd', 'exchange_rate', 'status', 'bank_details']);

        $pendingDepositsAmount = round((float) $pendingDeposits->sum(
            fn (Deposit $deposit) => self::depositToWallet($deposit, $walletCurrency)
        ), 2);

        $totalDepositsAmount = round((float) $approvedDeposits->sum(
            fn (Deposit $deposit) => self::depositToWallet($deposit, $walletCurrency)
        ), 2);

        $pendingWithdrawalsAmount = round((float) $pendingWithdrawals->sum(
            fn (Withdrawal $w) => self::withdrawalToCurrency($w, $walletCurrency)
        ), 2);

        $totalWithdrawalsAmount = round((float) $approvedWithdrawals->sum(
            fn (Withdrawal $w) => self::withdrawalToCurrency($w, $walletCurrency)
        ), 2);

        $pendingWithdrawalsUsd = self::withdrawalsUsdSum($pendingWithdrawals, $walletCurrency, $isPkrInvestor, $displayUsdRate);
        $totalWithdrawalsUsd = self::withdrawalsUsdSum($approvedWithdrawals, $walletCurrency, $isPkrInvestor, $displayUsdRate);

        $totalDepositsUsd = round((float) $approvedDeposits->sum(
            fn (Deposit $deposit) => self::depositToCurrency($deposit, 'USD')
        ), 2);

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

        return self::depositToCurrency($deposit, $walletCurrency);
    }

    private static function depositToCurrency(Deposit $deposit, string $currency): float
    {
        if (strtoupper($currency) === 'USD' && $deposit->amount_usd !== null) {
            return (float) $deposit->amount_usd;
        }

        $depositCurrency = strtoupper($deposit->currency ?: 'USD');

        return (float) ExchangeRateService::convert(
            (float) $deposit->amount,
            $depositCurrency,
            $currency
        )['amount'];
    }

    private static function withdrawalToCurrency(Withdrawal $withdrawal, string $currency): float
    {
        $amount = (float) $withdrawal->amount;
        $from = self::withdrawalCurrency($withdrawal, $currency);
        if ($from === strtoupper($currency)) {
            return $amount;
        }

        return (float) ExchangeRateService::convert($amount, $from, $currency)['amount'];
    }

    private static function withdrawalCurrency(Withdrawal $withdrawal, string $fallbackCurrency): string
    {
        $bankDetails = is_array($withdrawal->bank_details) ? $withdrawal->bank_details : [];
        $currency = strtoupper(trim((string) ($bankDetails['currency'] ?? '')));

        if ($currency !== '') {
            return $currency;
        }

        // Older PKR withdrawals recorded the exchange rate before bank-details
        // currency was added. Otherwise, their amount followed the wallet currency.
        return $withdrawal->exchange_rate !== null ? 'PKR' : strtoupper($fallbackCurrency);
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
            return 0.0;
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
        $sourceCurrency = self::withdrawalCurrency($withdrawal, $walletCurrency);
        $rate = $withdrawal->exchange_rate !== null ? (float) $withdrawal->exchange_rate : null;
        if ($sourceCurrency === 'PKR' && $rate !== null && $rate > 0) {
            return round($amount / $rate, 2);
        }
        if ($sourceCurrency === 'PKR' && $isPkrInvestor && $displayUsdRate !== null && $displayUsdRate > 0) {
            return round($amount / $displayUsdRate, 2);
        }

        return (float) ExchangeRateService::convert($amount, $sourceCurrency, 'USD')['amount'];
    }
}
