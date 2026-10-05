<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\Deposit;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Support\ExchangeRateService;
use App\Support\InvestorMarket;
use App\Services\InvestorTransactionPdfGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    use PaginatesQueries;

    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('profile');
        $walletCurrency = InvestorMarket::currencyForUser($user);

        $wallet = Wallet::query()->firstOrCreate(
            ['user_id' => $user->id],
            [
                'currency' => $walletCurrency,
                'available_balance' => 0,
                'pending_balance' => 0,
            ]
        );

        if ($wallet->currency !== $walletCurrency) {
            $wallet->update(['currency' => $walletCurrency]);
        }

        $ratesPayload = ExchangeRateService::getRates();
        $breakdown = $this->buildDepositBreakdown($user->id);

        return response()->json([
            'data' => [
                'id' => $wallet->id,
                'user_id' => $wallet->user_id,
                'currency' => $wallet->currency,
                'available_balance' => (float) $wallet->available_balance,
                'pending_balance' => (float) $wallet->pending_balance,
                'investable_balance' => (float) $wallet->available_balance,
                'deposit_breakdown' => $breakdown,
                'rates_as_of' => $ratesPayload['as_of'],
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
                'currency' => InvestorMarket::currencyForUser($request->user()),
                'available_balance' => 0,
                'pending_balance' => 0,
            ]
        );

        $transactions = $wallet->transactions()
            ->latest()
            ->paginate($this->perPage($request));

        return response()->json($transactions);
    }

    public function transaction(Request $request, int $id): JsonResponse
    {
        $wallet = Wallet::query()
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $transaction = $wallet->transactions()->findOrFail($id);

        return response()->json(['data' => $transaction]);
    }

    public function transactionPdf(Request $request, int $id, InvestorTransactionPdfGenerator $pdf): \Symfony\Component\HttpFoundation\Response
    {
        $wallet = Wallet::query()->where('user_id', $request->user()->id)->firstOrFail();

        $transaction = WalletTransaction::query()
            ->where('wallet_id', $wallet->id)
            ->findOrFail($id);

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
