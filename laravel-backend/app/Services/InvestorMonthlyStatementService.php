<?php

namespace App\Services;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Support\InvestorMarket;
use App\Support\InvestorProfitTotals;
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
        if (! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month)) {
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
                'currency' => InvestorMarket::currencyForUser($user),
                'available_balance' => 0,
                'pending_balance' => 0,
            ],
        );
        $currency = $wallet->currency ?: InvestorMarket::currencyForUser($user);

        $transactions = $wallet->transactions()
            ->where(function ($query) use ($start) {
                $query->where('created_at', '>=', $start)
                    ->orWhere('updated_at', '>=', $start);
            })
            ->orderBy('created_at')
            ->get();

        $events = $transactions
            ->filter(fn (WalletTransaction $transaction) => $transaction->status === 'completed'
                && in_array($transaction->direction, ['credit', 'debit'], true))
            ->map(function (WalletTransaction $transaction) use ($currency) {
                $createdAt = $transaction->created_at;
                $postedAt = $transaction->updated_at && $createdAt
                    && $transaction->updated_at->greaterThan($createdAt)
                    ? $transaction->updated_at
                    : $createdAt;

                if (! $postedAt) {
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

        if (! is_numeric($principalValue) || ! is_numeric($profitValue)) {
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