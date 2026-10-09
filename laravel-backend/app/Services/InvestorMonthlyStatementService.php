<?php

namespace App\Services;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\Withdrawal;
use App\Support\InvestorProfitTotals;
use App\Support\InvestorWithdrawalBreakdown;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class InvestorMonthlyStatementService
{
    /**
     * Build an account statement in the wallet's currency from the investor's posted wallet ledger.
     *
     * @return array<string, mixed>
     */
    public function build(User $user, ?string $month = null): array
    {
        $month ??= now()->format('Y-m');
        if (preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month) !== 1) {
            throw ValidationException::withMessages([
                'month' => ['Choose a month in YYYY-MM format.'],
            ]);
        }

        $start = Carbon::createFromFormat('!Y-m', $month);
        if ($start->greaterThan(now()->copy()->startOfMonth())) {
            throw ValidationException::withMessages([
                'month' => ['A statement is not available for a future month.'],
            ]);
        }

        $end = $start->copy()->endOfMonth()->endOfDay();
        $wallet = Wallet::query()->firstOrCreate(
            ['user_id' => $user->id],
            [
                'currency' => 'USD',
                'available_balance' => 0,
                'pending_balance' => 0,
            ],
        );
        $currency = $wallet->currency ?: 'USD';

        $transactions = $wallet->transactions()
            ->with('wallet')
            ->where(function ($query) use ($start) {
                $query->where('created_at', '>=', $start)
                    ->orWhere('updated_at', '>=', $start);
            })
            ->orderBy('created_at')
            ->get();

        $withdrawalTransactions = $transactions->filter(
            fn (WalletTransaction $transaction) => strtolower((string) $transaction->type) === 'withdrawal',
        );
        $withdrawalIds = $withdrawalTransactions
            ->map(fn (WalletTransaction $transaction) => (is_array($transaction->meta) ? $transaction->meta : [])['withdrawal_id'] ?? null)
            ->filter(fn (mixed $id) => is_numeric($id))
            ->map(fn (mixed $id) => (int) $id)
            ->unique()
            ->values()
            ->all();
        $withdrawalReferences = $withdrawalTransactions
            ->pluck('reference')
            ->filter(fn (mixed $reference) => is_string($reference) && trim($reference) !== '')
            ->unique()
            ->values()
            ->all();
        $withdrawals = collect();
        if ($withdrawalIds !== [] || $withdrawalReferences !== []) {
            $withdrawals = Withdrawal::query()
                ->where('investor_id', $user->id)
                ->where(function ($query) use ($withdrawalIds, $withdrawalReferences) {
                    if ($withdrawalIds !== []) {
                        $query->whereIn('id', $withdrawalIds);
                    }
                    if ($withdrawalReferences !== []) {
                        $method = $withdrawalIds === [] ? 'whereIn' : 'orWhereIn';
                        $query->{$method}('reference', $withdrawalReferences);
                    }
                })
                ->get();
        }
        $withdrawalsById = $withdrawals->keyBy(fn (Withdrawal $withdrawal) => (string) $withdrawal->id);
        $withdrawalsByReference = $withdrawals->filter(
            fn (Withdrawal $withdrawal) => is_string($withdrawal->reference) && $withdrawal->reference !== '',
        )->keyBy('reference');

        $events = $transactions
            ->filter(fn (WalletTransaction $transaction) => $transaction->status === 'completed'
                && in_array($transaction->direction, ['credit', 'debit'], true))
            ->map(function (WalletTransaction $transaction) use ($currency, $withdrawalsById, $withdrawalsByReference) {
                $createdAt = $transaction->created_at;
                $postedAt = $transaction->updated_at && $createdAt
                    && $transaction->updated_at->greaterThan($createdAt)
                    ? $transaction->updated_at
                    : $createdAt;

                if ($postedAt === null) {
                    return null;
                }

                $type = strtolower((string) $transaction->type);
                $direction = strtolower((string) $transaction->direction);
                $amount = round((float) $transaction->amount, 2);
                $change = $direction === 'credit' ? $amount : -$amount;
                $meta = is_array($transaction->meta) ? $transaction->meta : [];
                $returnBreakdown = $type === 'investment_return' && $direction === 'credit'
                    ? $this->investmentReturnBreakdown($meta, $amount)
                    : null;
                $category = $returnBreakdown
                    ? 'investment_return'
                    : $this->category($type, $direction);
                $withdrawalBreakdown = null;
                if ($type === 'withdrawal' && $direction === 'debit') {
                    $withdrawalId = $meta['withdrawal_id'] ?? null;
                    $withdrawal = is_numeric($withdrawalId)
                        ? $withdrawalsById->get((string) (int) $withdrawalId)
                        : null;
                    $withdrawal ??= $transaction->reference
                        ? $withdrawalsByReference->get((string) $transaction->reference)
                        : null;
                    $withdrawalBreakdown = $this->withdrawalBreakdown($transaction, $withdrawal, $currency);
                }

                return [
                    'transaction_id' => (int) $transaction->id,
                    'type' => $type,
                    'category' => $category,
                    'direction' => $direction,
                    'amount' => $amount,
                    'currency' => $currency,
                    'balance_change' => round($change, 2),
                    'reference' => (string) ($transaction->reference ?? ''),
                    'status' => (string) $transaction->status,
                    'investment_id' => isset($meta['investment_id']) ? (string) $meta['investment_id'] : '',
                    'principal_return' => $returnBreakdown['principal'] ?? null,
                    'distribution_amount' => $returnBreakdown['profit'] ?? null,
                    'withdrawal_breakdown' => $withdrawalBreakdown,
                    'date_time' => $postedAt->toIso8601String(),
                    '_posted_at' => $postedAt,
                ];
            })
            ->filter()
            ->sortBy(fn (array $event) => $event['_posted_at']->getTimestamp())
            ->values();

        $currentBalance = round((float) $wallet->available_balance + (float) $wallet->pending_balance, 2);
        $movementsAfterStatement = (float) $events
            ->filter(fn (array $event) => $event['_posted_at']->greaterThan($end))
            ->sum('balance_change');
        $closingBalance = round($currentBalance - $movementsAfterStatement, 2);

        $periodEvents = $events
            ->filter(fn (array $event) => $event['_posted_at']->greaterThanOrEqualTo($start)
                && $event['_posted_at']->lessThanOrEqualTo($end))
            ->values();
        $periodMovement = (float) $periodEvents->sum('balance_change');
        $openingBalance = round($closingBalance - $periodMovement, 2);

        $totals = [
            'deposits' => 0.0,
            'investments' => 0.0,
            'distributions' => 0.0,
            'principal_returns' => 0.0,
            'withdrawals' => 0.0,
            'other_movements' => 0.0,
        ];
        foreach ($periodEvents as $event) {
            if ($event['category'] === 'investment_return') {
                $totals['principal_returns'] += $event['principal_return'];
                $totals['distributions'] += $event['distribution_amount'];
            } elseif ($event['category'] === 'other_movements') {
                $totals['other_movements'] += $event['balance_change'];
            } else {
                $totals[$event['category']] += $event['amount'];
            }
        }
        foreach ($totals as $key => $value) {
            $totals[$key] = round($value, 2);
        }

        $firstRecordedAt = $wallet->transactions()->min('created_at');
        $firstMonth = $firstRecordedAt
            ? Carbon::parse($firstRecordedAt)->startOfMonth()
            : now()->copy()->startOfMonth();
        $cursor = $firstMonth->copy();
        $currentMonth = now()->copy()->startOfMonth();
        $availableMonths = [];
        while ($cursor->lessThanOrEqualTo($currentMonth)) {
            $availableMonths[] = $cursor->format('Y-m');
            $cursor->addMonth();
        }

        $statementTransactions = $periodEvents
            ->sortByDesc(fn (array $event) => $event['_posted_at']->getTimestamp())
            ->map(function (array $event) {
                unset($event['balance_change'], $event['_posted_at']);

                return $event;
            })
            ->values()
            ->all();

        return [
            'month' => $month,
            'month_label' => $start->format('F Y'),
            'currency' => $currency,
            'opening_balance' => $openingBalance,
            ...$totals,
            'closing_balance' => $closingBalance,
            'available_months' => array_reverse($availableMonths),
            'transactions' => $statementTransactions,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    private function category(string $type, string $direction): string
    {
        if ($type === 'deposit' && $direction === 'credit') {
            return 'deposits';
        }
        if ($type === 'investment' && $direction === 'debit') {
            return 'investments';
        }
        if ($type === 'withdrawal' && $direction === 'debit') {
            return 'withdrawals';
        }
        if (
            $direction === 'credit'
            && in_array($type, [...InvestorProfitTotals::WALLET_PROFIT_TYPES, 'investment_return'], true)
        ) {
            return 'distributions';
        }

        return 'other_movements';
    }

    /**
     * Use only saved withdrawal values and the saved FX snapshot. A missing fee stays null;
     * the ledger debit is used only as the total debit when the saved total is absent.
     *
     * @param  array<string, mixed>  $meta
     * @return array{
     *     payout_amount: float|null,
     *     payout_amount_usd: float|null,
     *     fee: float|null,
     *     fee_usd: float|null,
     *     total_debit: float|null,
     *     total_debit_usd: float|null,
     *     currency: string|null,
     *     exchange_rate: float|null
     * }
     */
    private function withdrawalBreakdown(
        WalletTransaction $transaction,
        ?Withdrawal $withdrawal,
        string $statementCurrency,
    ): array {
        $meta = is_array($transaction->meta) ? $transaction->meta : [];
        if ($withdrawal) {
            $breakdown = InvestorWithdrawalBreakdown::fromWithdrawal($withdrawal, $transaction);
        } else {
            $breakdown = [
                'payout_amount' => $this->recordedMoney($meta['payout_amount'] ?? null),
                'payout_amount_usd' => $this->recordedMoney($meta['amount_usd'] ?? null),
                'fee' => $this->recordedMoney($meta['fee'] ?? null),
                'fee_usd' => $this->recordedMoney($meta['fee_usd'] ?? null),
                'total_debit' => $this->recordedMoney($meta['total_debit'] ?? null)
                    ?? ($transaction->direction === 'debit' && $transaction->amount !== null
                        ? (float) $transaction->amount
                        : null),
                'total_debit_usd' => $this->recordedMoney($meta['total_debit_usd'] ?? null),
                'currency' => $this->recordedCurrency($meta['currency'] ?? null) ?? strtoupper($statementCurrency),
                'exchange_rate' => $this->recordedMoney($meta['exchange_rate'] ?? null),
            ];
        }

        $currency = $this->recordedCurrency($breakdown['currency'] ?? null) ?? strtoupper($statementCurrency);
        $exchangeRate = $breakdown['exchange_rate'] !== null
            ? (float) $breakdown['exchange_rate']
            : null;
        $breakdown['currency'] = $currency;
        $breakdown['payout_amount_usd'] = $this->usdEquivalent(
            $breakdown['payout_amount_usd'],
            $breakdown['payout_amount'],
            $exchangeRate,
            $currency,
        );
        $breakdown['fee_usd'] = $this->usdEquivalent(
            $breakdown['fee_usd'],
            $breakdown['fee'],
            $exchangeRate,
            $currency,
        );
        $breakdown['total_debit_usd'] = $this->usdEquivalent(
            $breakdown['total_debit_usd'],
            $breakdown['total_debit'],
            $exchangeRate,
            $currency,
        );

        return $breakdown;
    }

    private function usdEquivalent(
        ?float $storedUsd,
        ?float $recordedAmount,
        ?float $exchangeRate,
        string $currency,
    ): ?float {
        if ($storedUsd !== null) {
            return round($storedUsd, 2);
        }
        if ($recordedAmount === null) {
            return null;
        }
        if ($currency === 'USD') {
            return round($recordedAmount, 2);
        }
        if ($currency === 'PKR' && $exchangeRate !== null && $exchangeRate > 0) {
            return round($recordedAmount / $exchangeRate, 2);
        }

        return null;
    }

    private function recordedMoney(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    private function recordedCurrency(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== ''
            ? strtoupper(trim($value))
            : null;
    }

    /**
     * Investment completion credits principal and profit together. Split only when ledger
     * metadata provides both components in the wallet currency and they reconcile to the credit.
     *
     * @param  array<string, mixed>  $meta
     * @return array{principal: float, profit: float}|null
     */
    private function investmentReturnBreakdown(array $meta, float $amount): ?array
    {
        $principalValue = $meta['invested_amount_pkr'] ?? $meta['invested_amount'] ?? null;
        $profitValue = $meta['profit_amount_pkr'] ?? $meta['profit_amount'] ?? null;

        if (is_numeric($principalValue) === false || is_numeric($profitValue) === false) {
            return null;
        }

        $principal = round((float) $principalValue, 2);
        $profit = round((float) $profitValue, 2);
        if (abs(round($principal + $profit, 2) - $amount) > 0.01) {
            return null;
        }

        return ['principal' => $principal, 'profit' => $profit];
    }
}
