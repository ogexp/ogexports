<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\Deposit;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\Withdrawal;
use App\Support\ExchangeRateService;
use App\Support\FinancialTransactionIdResolver;
use App\Support\InvestorWithdrawalBreakdown;
use App\Support\UserDisplayCurrency;
use App\Support\WithdrawalTerms;
use App\Services\InvestorTransactionPdfGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    use PaginatesQueries;

    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('profile');
        $defaultWalletCurrency = UserDisplayCurrency::currencyForUser($user);

        $wallet = Wallet::query()->firstOrCreate(
            ['user_id' => $user->id],
            [
                'currency' => $defaultWalletCurrency,
                'available_balance' => 0,
                'pending_balance' => 0,
            ]
        );

        $walletCurrency = strtoupper(trim((string) ($wallet->currency ?: $defaultWalletCurrency)));

        $ratesPayload = ExchangeRateService::getRates();
        $breakdown = $this->buildDepositBreakdown($user->id);
        $withdrawalTerms = WithdrawalTerms::forCurrency($walletCurrency);

        return response()->json([
            'data' => [
                'id' => $wallet->id,
                'user_id' => $wallet->user_id,
                'currency' => $walletCurrency,
                'available_balance' => (float) $wallet->available_balance,
                'pending_balance' => (float) $wallet->pending_balance,
                'investable_balance' => (float) $wallet->available_balance,
                'deposit_breakdown' => $breakdown,
                'rates_as_of' => $ratesPayload['as_of'],
                'withdrawal_fee' => $withdrawalTerms['fee'],
                'withdrawal_fee_usd' => $withdrawalTerms['fee_usd'],
                'withdrawal_fee_currency' => $withdrawalTerms['fee_currency'],
                'minimum_withdrawal_amount' => $withdrawalTerms['minimum_withdrawal_amount'],
                'minimum_withdrawal_usd' => $withdrawalTerms['minimum_withdrawal_usd'],
                'minimum_withdrawal_currency' => $withdrawalTerms['minimum_withdrawal_currency'],
                'estimated_processing_time' => $withdrawalTerms['estimated_processing_time'],
            ],
        ]);
    }

    public function exchangeRates(): JsonResponse
    {
        $payload = ExchangeRateService::getRates();

        return response()->json([
            'data' => [
                'base' => 'USD',
                'rates' => $payload['rates'],
                'as_of' => $payload['as_of'],
            ],
        ]);
    }

    public function transactions(Request $request): JsonResponse
    {
        $wallet = Wallet::query()->firstOrCreate(
            ['user_id' => $request->user()->id],
            [
                'currency' => UserDisplayCurrency::currencyForUser($request->user()),
                'available_balance' => 0,
                'pending_balance' => 0,
            ]
        );

        $transactions = $wallet->transactions()
            ->with('wallet:id,currency')
            ->latest()
            ->paginate($this->perPage($request));

        return response()->json($transactions);
    }

    public function transaction(Request $request, int $id): JsonResponse
    {
        $wallet = Wallet::query()
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $transaction = FinancialTransactionIdResolver::findOrFail(
            WalletTransaction::query()->where('wallet_id', $wallet->id),
            $id,
        );
        $meta = is_array($transaction->meta) ? $transaction->meta : [];
        $withdrawal = $transaction->type === 'withdrawal' && is_numeric($meta['withdrawal_id'] ?? null)
            ? Withdrawal::query()
                ->where('investor_id', $request->user()->id)
                ->find($meta['withdrawal_id'])
            : null;
        $transactionData = $transaction->toArray();
        $transactionData['withdrawal_breakdown'] = $withdrawal
            ? InvestorWithdrawalBreakdown::fromWithdrawal($withdrawal, $transaction)
            : null;

        return response()->json(['data' => $transactionData]);
    }

    public function transactionPdf(Request $request, int $id, InvestorTransactionPdfGenerator $pdf): \Symfony\Component\HttpFoundation\Response
    {
        $wallet = Wallet::query()->where('user_id', $request->user()->id)->firstOrFail();

        $transaction = FinancialTransactionIdResolver::findOrFail(
            WalletTransaction::query()->where('wallet_id', $wallet->id),
            $id,
        );

        return $pdf->walletTransaction($transaction, $request->user());
    }

    /**
     * @return list<array{currency: string, original_total: float, converted_total: float}>
     */
    private function buildDepositBreakdown(int $userId): array
    {
        $approved = Deposit::query()
            ->where('investor_id', $userId)
            ->where('status', 'approved')
            ->get(['currency', 'amount', 'converted_amount']);

        $grouped = [];

        foreach ($approved as $deposit) {
            $code = strtoupper($deposit->currency ?: 'USD');
            if (! isset($grouped[$code])) {
                $grouped[$code] = ['original_total' => 0.0, 'converted_total' => 0.0];
            }
            $grouped[$code]['original_total'] += (float) $deposit->amount;
            $grouped[$code]['converted_total'] += (float) ($deposit->converted_amount ?? $deposit->amount);
        }

        $breakdown = [];
        foreach ($grouped as $currency => $totals) {
            $breakdown[] = [
                'currency' => $currency,
                'original_total' => round($totals['original_total'], 2),
                'converted_total' => round($totals['converted_total'], 2),
            ];
        }

        usort($breakdown, fn ($a, $b) => strcmp($a['currency'], $b['currency']));

        return $breakdown;
    }
}
