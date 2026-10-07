<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\Deposit;
use App\Models\Investment;
use App\Models\Order;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\Withdrawal;
use App\Services\BuyerTradeNotifier;
use App\Support\AuditsActions;
use App\Support\DepositReviewStatuses;
use App\Support\ExchangeRateService;
use App\Support\InvestorNotificationTypes;
use App\Support\InvestorMarket;
use App\Support\MediaStorage;
use App\Support\NotifiesUsers;
use App\Support\PlatformWalletService;
use App\Support\UserDisplayCurrency;
use App\Support\FinanceStatsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class FinanceController extends Controller
{
    use PaginatesQueries;

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

    public function stats(): JsonResponse
    {
        return response()->json([
            'data' => (new FinanceStatsService)->overview(),
        ]);
    }

    public function deposits(Request $request): JsonResponse
    {
        $query = Deposit::query()->with([
            'investor:id,name,email',
            'investor.profile:id,user_id,country',
            'investor.wallet:id,user_id,currency',
            'bankAccount:id,bank_name,account_number',
            'project',
        ]);

        if ($status = $request->input('status')) {
            $normalized = DepositReviewStatuses::normalize($status);
            $query->where('status', $normalized);
        }

        $paginator = $query->latest()->paginate($this->perPage($request));
        $paginator->getCollection()->transform(fn (Deposit $deposit) => $this->transformDeposit($deposit));

        return response()->json($paginator);
    }

    public function depositProof(int $id): Response
    {
        $deposit = Deposit::query()->findOrFail($id);

        if (! $deposit->proof_path) {
            abort(404, 'No proof uploaded for this deposit.');
        }

        abort_unless(MediaStorage::exists($deposit->proof_path), 404, 'File not found.');

        $ext = pathinfo($deposit->proof_path, PATHINFO_EXTENSION);
        $filename = 'deposit-proof-'.$deposit->id.($ext ? '.'.$ext : '');

        return MediaStorage::response($deposit->proof_path, $filename);
    }

    public function buyerDeposits(Request $request): JsonResponse
    {
        $query = Order::query()
            ->with([
                'buyer:id,name,email',
                'buyer.profile:id,user_id,country',
                'items',
            ])
            ->whereIn('payment_status', DepositReviewStatuses::buyerListedStorage());

        if ($status = $request->input('status')) {
            $query->whereIn('payment_status', DepositReviewStatuses::buyerStorageForFilter($status));
        }

        $orders = $query->latest('payment_submitted_at')
            ->latest()
            ->paginate($this->perPage($request));

        $orders->setCollection(
            $orders->getCollection()->map(fn (Order $order) => $this->transformBuyerDeposit($order))
        );

        return response()->json($orders);
    }

    public function approveBuyerDeposit(Request $request, int $id): JsonResponse
    {
        $order = Order::query()->with(['buyer:id,name,email', 'items'])->findOrFail($id);

        if (! DepositReviewStatuses::isPending($order->payment_status)) {
            throw ValidationException::withMessages(['status' => ['Buyer payment is not pending review.']]);
        }

        $order->update([
            'payment_status' => DepositReviewStatuses::APPROVED,
        ]);

        AuditsActions::log('buyer_deposit.approved', 'finance', $request->user(), [
            'order_id' => $id,
            'order_number' => $order->order_number,
        ]);

        BuyerTradeNotifier::paymentApproved($order);

        return response()->json([
            'message' => 'Buyer payment approved.',
            'data' => $this->transformBuyerDeposit($order->fresh(['buyer:id,name,email', 'items'])),
        ]);
    }

    public function rejectBuyerDeposit(Request $request, int $id): JsonResponse
    {
        $order = Order::query()->with(['buyer:id,name,email', 'items'])->findOrFail($id);

        if (! DepositReviewStatuses::isPending($order->payment_status)) {
            throw ValidationException::withMessages(['status' => ['Buyer payment is not pending review.']]);
        }

        $order->update([
            'payment_status' => DepositReviewStatuses::REJECTED,
        ]);

        AuditsActions::log('buyer_deposit.rejected', 'finance', $request->user(), [
            'order_id' => $id,
            'order_number' => $order->order_number,
        ]);

        BuyerTradeNotifier::paymentRejected($order);

        return response()->json([
            'message' => 'Buyer payment rejected.',
            'data' => $this->transformBuyerDeposit($order->fresh(['buyer:id,name,email', 'items'])),
        ]);
    }

    public function cancelBuyerDeposit(Request $request, int $id): JsonResponse
    {
        $order = Order::query()->with(['buyer:id,name,email', 'items'])->findOrFail($id);

        if (! DepositReviewStatuses::isPending($order->payment_status)) {
            throw ValidationException::withMessages(['status' => ['Only pending buyer payments can be cancelled.']]);
        }

        $order->update([
            'payment_status' => DepositReviewStatuses::CANCELLED,
        ]);

        AuditsActions::log('buyer_deposit.cancelled', 'finance', $request->user(), [
            'order_id' => $id,
            'order_number' => $order->order_number,
        ]);

        BuyerTradeNotifier::paymentCancelled($order);

        return response()->json([
            'message' => 'Buyer payment cancelled.',
            'data' => $this->transformBuyerDeposit($order->fresh(['buyer:id,name,email', 'items'])),
        ]);
    }

    public function approveDeposit(Request $request, int $id): JsonResponse
    {
        $deposit = Deposit::query()->findOrFail($id);

        if (! DepositReviewStatuses::isPending($deposit->status)) {
            throw ValidationException::withMessages(['status' => ['Deposit is not pending.']]);
        }

        DB::transaction(function () use ($deposit, $request) {
            $deposit->loadMissing('investor.profile');

            $walletCurrency = InvestorMarket::currencyForUser($deposit->investor);
            $depositCurrency = strtoupper($deposit->currency ?: 'USD');

            $conversion = ExchangeRateService::convert(
                (float) $deposit->amount,
                $depositCurrency,
                $walletCurrency
            );

            $wallet = Wallet::query()->firstOrCreate(
                ['user_id' => $deposit->investor_id],
                ['currency' => $walletCurrency, 'available_balance' => 0, 'pending_balance' => 0]
            );

            if ($wallet->currency !== $walletCurrency) {
                $wallet->update(['currency' => $walletCurrency]);
            }

            $wallet->increment('available_balance', $conversion['amount']);

            WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'type' => 'deposit',
                'amount' => $conversion['amount'],
                'direction' => 'credit',
                'reference' => $deposit->reference ?? sprintf('OGDEP-INV-%03d', $deposit->id),
                'status' => 'completed',
                'meta' => [
                    'deposit_id' => $deposit->id,
                    'original_amount' => (float) $deposit->amount,
                    'original_currency' => $depositCurrency,
                    'exchange_rate' => $conversion['rate'],
                    'wallet_currency' => $walletCurrency,
                    'rates_as_of' => $conversion['as_of'],
                ],
            ]);

            // Preserve submission-time USD snapshot; backfill for legacy PKR deposits.
            $amountUsd = $deposit->amount_usd !== null ? (float) $deposit->amount_usd : null;
            $usdExchangeRate = $deposit->usd_exchange_rate !== null ? (float) $deposit->usd_exchange_rate : null;

            if (
                ($amountUsd === null || $usdExchangeRate === null)
                && $depositCurrency === 'PKR'
                && UserDisplayCurrency::isPkrUser($deposit->investor)
            ) {
                try {
                    $snapshot = ExchangeRateService::pkrToUsdSnapshot((float) $deposit->amount);
                    $amountUsd = $amountUsd ?? $snapshot['amount_usd'];
                    $usdExchangeRate = $usdExchangeRate ?? $snapshot['exchange_rate'];
                } catch (\Throwable) {
                    // Leave null if FX unavailable.
                }
            }

            $deposit->update([
                'status' => 'approved',
                'converted_amount' => $conversion['amount'],
                'exchange_rate' => $conversion['rate'],
                'wallet_currency' => $walletCurrency,
                'amount_usd' => $amountUsd,
                'usd_exchange_rate' => $usdExchangeRate,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'note' => $request->input('note'),
            ]);
        });

        AuditsActions::log('deposit.approved', 'finance', $request->user(), ['deposit_id' => $id]);

        $deposit = $deposit->fresh()->load('investor');
        if ($deposit->investor) {
            $amount = number_format((float) $deposit->amount, 2);
            $currency = strtoupper($deposit->currency ?: 'USD');
            NotifiesUsers::notifyAndEmail(
                $deposit->investor,
                InvestorNotificationTypes::DEPOSIT_APPROVED,
                "Deposit approved — {$currency} {$amount}",
                "Your deposit of {$currency} {$amount} has been verified and credited to your wallet. Reference: ".($deposit->reference ?? sprintf('OGDEP-INV-%03d', $deposit->id)),
                [
                    'deposit_id' => $deposit->id,
                    'transaction_type' => 'deposit',
                    'transaction_status' => 'approved',
                    'reference' => $deposit->reference ?? sprintf('OGDEP-INV-%03d', $deposit->id),
                    'href' => "/invest/transactions/deposit/{$deposit->id}",
                ],
                'deposit_approved',
                [
                    'amount' => $amount,
                    'currency' => $currency,
                    'reference' => $deposit->reference ?? sprintf('OGDEP-INV-%03d', $deposit->id),
                    'portal_url' => config('app.frontend_url', config('app.url'))."/invest/transactions/deposit/{$deposit->id}",
                ]
            );
        }

        return response()->json([
            'message' => 'Deposit approved.',
            'data' => $deposit,
        ]);
    }

    public function rejectDeposit(Request $request, int $id): JsonResponse
    {
        $deposit = Deposit::query()->findOrFail($id);

        if (! DepositReviewStatuses::isPending($deposit->status)) {
            throw ValidationException::withMessages(['status' => ['Deposit is not pending.']]);
        }

        $deposit->update([
            'status' => DepositReviewStatuses::REJECTED,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'note' => $request->input('note'),
        ]);

        AuditsActions::log('deposit.rejected', 'finance', $request->user(), ['deposit_id' => $id]);

        $deposit = $deposit->fresh()->load('investor');
        if ($deposit->investor) {
            $amount = number_format((float) $deposit->amount, 2);
            $currency = strtoupper($deposit->currency ?: 'USD');
            $note = $request->input('note');
            $body = filled($note)
                ? "Your deposit of {$currency} {$amount} was rejected. Reason: {$note}"
                : "Your deposit of {$currency} {$amount} was rejected. Please contact support if you need assistance.";

            NotifiesUsers::notifyAndEmail(
                $deposit->investor,
                InvestorNotificationTypes::DEPOSIT_REJECTED,
                'Deposit rejected',
                $body.' No wallet credit was recorded for this deposit.',
                [
                    'deposit_id' => $deposit->id,
                    'transaction_type' => 'deposit',
                    'transaction_status' => 'rejected',
                    'reference' => $deposit->reference ?? sprintf('OGDEP-INV-%03d', $deposit->id),
                    'href' => "/invest/transactions/deposit/{$deposit->id}",
                ],
                'deposit_rejected',
                [
                    'amount' => $amount,
                    'currency' => $currency,
                    'reference' => $deposit->reference ?? sprintf('OGDEP-INV-%03d', $deposit->id),
                    'notes' => $note ?? '',
                    'portal_url' => config('app.frontend_url', config('app.url'))."/invest/transactions/deposit/{$deposit->id}",
                ]
            );
        }

        return response()->json([
            'message' => 'Deposit rejected.',
            'data' => $deposit,
        ]);
    }

    public function cancelDeposit(Request $request, int $id): JsonResponse
    {
        $deposit = Deposit::query()->findOrFail($id);

        if (! DepositReviewStatuses::isPending($deposit->status)) {
            throw ValidationException::withMessages(['status' => ['Only pending deposits can be cancelled.']]);
        }

        $deposit->update([
            'status' => DepositReviewStatuses::CANCELLED,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'note' => $request->input('note'),
        ]);

        AuditsActions::log('deposit.cancelled', 'finance', $request->user(), ['deposit_id' => $id]);

        $deposit = $deposit->fresh()->load('investor');
        if ($deposit->investor) {
            $amount = number_format((float) $deposit->amount, 2);
            $currency = strtoupper($deposit->currency ?: 'USD');
            NotifiesUsers::notifyAndEmail(
                $deposit->investor,
                InvestorNotificationTypes::DEPOSIT_CANCELLED,
                'Deposit cancelled',
                "Your pending deposit of {$currency} {$amount} has been cancelled by the platform. No wallet credit was recorded for this deposit.",
                [
                    'deposit_id' => $deposit->id,
                    'transaction_type' => 'deposit',
                    'transaction_status' => 'cancelled',
                    'reference' => $deposit->reference ?? sprintf('OGDEP-INV-%03d', $deposit->id),
                    'href' => "/invest/transactions/deposit/{$deposit->id}",
                ],
                'deposit_cancelled',
                [
                    'reference' => $deposit->reference ?? sprintf('OGDEP-INV-%03d', $deposit->id),
                    'notes' => $request->input('note') ?? '',
                    'portal_url' => config('app.frontend_url', config('app.url'))."/invest/transactions/deposit/{$deposit->id}",
                ]
            );
        }

        return response()->json([
            'message' => 'Deposit cancelled.',
            'data' => $deposit,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transformBuyerDeposit(Order $order): array
    {
        $items = $order->items ?? collect();
        $first = $items->first();
        $product = $first?->product_name
            ?? (is_object($first?->product) ? $first->product->name : null)
            ?? null;

        $details = [];
        if ($order->payment_field1_label || $order->payment_field1_value) {
            $details[] = trim(($order->payment_field1_label ?: 'Detail').': '.($order->payment_field1_value ?: '—'));
        }
        if ($order->payment_field2_label || $order->payment_field2_value) {
            $details[] = trim(($order->payment_field2_label ?: 'Detail').': '.($order->payment_field2_value ?: '—'));
        }
        if ($details === [] && filled($order->notes)) {
            $lines = preg_split('/\n+/', (string) $order->notes) ?: [];
            $paymentLine = collect($lines)->reverse()->first(function ($line) {
                $line = trim((string) $line);

                return $line !== '' && str_contains($line, ':')
                    && ! preg_match('/^(Destination|Incoterm|Required delivery)/i', $line);
            });
            if ($paymentLine) {
                $details[] = trim((string) $paymentLine);
            }
        }

        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'buyer' => UserDisplayCurrency::userPayload($order->buyer),
            'amount' => $order->total_value,
            'currency' => $order->currency,
            'payment_method' => $order->payment_method,
            'payment_method_code' => $order->payment_method_code,
            'payment_field1_label' => $order->payment_field1_label,
            'payment_field1_value' => $order->payment_field1_value,
            'payment_field2_label' => $order->payment_field2_label,
            'payment_field2_value' => $order->payment_field2_value,
            'payment_reference' => $order->payment_reference,
            'payment_submitted_at' => $order->payment_submitted_at?->toIso8601String(),
            'payment_status' => $order->payment_status,
            'review_status' => DepositReviewStatuses::normalize($order->payment_status),
            'review_status_label' => DepositReviewStatuses::label($order->payment_status),
            'details' => $details,
            'details_summary' => implode(' · ', $details),
            'notes' => $order->notes,
            'product' => $product,
            'created_at' => $order->created_at?->toIso8601String(),
            'updated_at' => $order->updated_at?->toIso8601String(),
        ];
    }

    public function withdrawals(Request $request): JsonResponse
    {
        $query = Withdrawal::query()->with([
            'investor:id,name,email',
            'investor.profile:id,user_id,country',
            'investor.wallet:id,user_id,currency',
        ]);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $paginator = $query->latest()->paginate($this->perPage($request));
        $paginator->getCollection()->transform(fn (Withdrawal $withdrawal) => $this->transformWithdrawal($withdrawal));

        return response()->json($paginator);
    }

    public function approveWithdrawal(Request $request, int $id): JsonResponse
    {
        $withdrawal = Withdrawal::query()->findOrFail($id);

        if (! in_array($withdrawal->status, ['pending', 'review'], true)) {
            throw ValidationException::withMessages(['status' => ['Withdrawal is not pending.']]);
        }

        DB::transaction(function () use ($withdrawal, $request) {
            $wallet = Wallet::query()
                ->where('user_id', $withdrawal->investor_id)
                ->lockForUpdate()
                ->first();

            if (! $wallet) {
                throw ValidationException::withMessages([
                    'amount' => ['Investor wallet not found.'],
                ]);
            }

            $amount = (float) ($withdrawal->total_debit ?? $withdrawal->amount);

            // Funds were reserved on request (available → pending). Finalize by clearing pending.
            if ((float) $wallet->pending_balance >= $amount) {
                $wallet->decrement('pending_balance', $amount);
            } elseif ((float) $wallet->available_balance >= $amount) {
                // Legacy withdrawals created before reservation — debit available now
                $wallet->decrement('available_balance', $amount);
            } else {
                throw ValidationException::withMessages([
                    'amount' => ['Insufficient wallet balance.'],
                ]);
            }

            $existingTxn = WalletTransaction::query()
                ->where('wallet_id', $wallet->id)
                ->where('type', 'withdrawal')
                ->where('meta->withdrawal_id', $withdrawal->id)
                ->first();

            if ($existingTxn) {
                $existingTxn->update(['status' => 'completed']);
            } else {
                WalletTransaction::create([
                    'wallet_id' => $wallet->id,
                    'type' => 'withdrawal',
                    'amount' => $amount,
                    'direction' => 'debit',
                    'reference' => $withdrawal->reference ?? 'WDR-'.$withdrawal->id,
                    'status' => 'completed',
                    'meta' => ['withdrawal_id' => $withdrawal->id],
                ]);
            }

            $withdrawal->update([
                'status' => 'approved',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'note' => $request->input('note'),
            ]);
        });

        AuditsActions::log('withdrawal.approved', 'finance', $request->user(), ['withdrawal_id' => $id]);

        $withdrawal = $withdrawal->fresh()->load('investor');
        if ($withdrawal->investor) {
            $amount = number_format((float) $withdrawal->amount, 2);
            NotifiesUsers::notifyAndEmail(
                $withdrawal->investor,
                InvestorNotificationTypes::WITHDRAWAL_APPROVED,
                "Withdrawal approved — {$amount}",
                'Your withdrawal request of '.$amount.' has been approved. This does not confirm that funds have reached your bank account. Current server status: approved. Reference: '.($withdrawal->reference ?? sprintf('OGWITH-INV-%03d', $withdrawal->id)),
                [
                    'withdrawal_id' => $withdrawal->id,
                    'transaction_type' => 'withdrawal',
                    'transaction_status' => 'approved',
                    'reference' => $withdrawal->reference ?? sprintf('OGWITH-INV-%03d', $withdrawal->id),
                    'href' => "/invest/transactions/withdrawal/{$withdrawal->id}",
                ],
                'withdraw_approved',
                [
                    'withdraw_id' => $withdrawal->reference ?? sprintf('OGWITH-INV-%03d', $withdrawal->id),
                    'amount' => $amount,
                    'currency' => strtoupper(is_array($withdrawal->bank_details) ? ($withdrawal->bank_details['currency'] ?? 'USD') : 'USD'),
                    'portal_url' => config('app.frontend_url', config('app.url'))."/invest/transactions/withdrawal/{$withdrawal->id}",
                ]
            );
        }

        return response()->json([
            'message' => 'Withdrawal approved.',
            'data' => $withdrawal,
        ]);
    }

    public function rejectWithdrawal(Request $request, int $id): JsonResponse
    {
        $withdrawal = Withdrawal::query()->findOrFail($id);

        if (! in_array($withdrawal->status, ['pending', 'review'], true)) {
            throw ValidationException::withMessages(['status' => ['Withdrawal is not pending.']]);
        }

        DB::transaction(function () use ($withdrawal, $request) {
            $wallet = Wallet::query()
                ->where('user_id', $withdrawal->investor_id)
                ->lockForUpdate()
                ->first();

            $amount = (float) ($withdrawal->total_debit ?? $withdrawal->amount);

            if ($wallet) {
                // Return reserved funds to available balance
                if ((float) $wallet->pending_balance >= $amount) {
                    $wallet->decrement('pending_balance', $amount);
                    $wallet->increment('available_balance', $amount);
                }

                WalletTransaction::query()
                    ->where('wallet_id', $wallet->id)
                    ->where('type', 'withdrawal')
                    ->where('meta->withdrawal_id', $withdrawal->id)
                    ->where('status', 'pending')
                    ->update(['status' => 'rejected']);
            }

            $withdrawal->update([
                'status' => 'rejected',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'note' => $request->input('note'),
            ]);
        });

        AuditsActions::log('withdrawal.rejected', 'finance', $request->user(), ['withdrawal_id' => $id]);

        $withdrawal = $withdrawal->fresh()->load('investor');
        if ($withdrawal->investor) {
            $amount = number_format((float) $withdrawal->amount, 2);
            $note = $request->input('note');
            $body = filled($note)
                ? "Your withdrawal request of {$amount} was rejected. Reason: {$note}"
                : "Your withdrawal request of {$amount} was rejected. Check your wallet balance and transaction history for the current available funds.";

            NotifiesUsers::notifyAndEmail(
                $withdrawal->investor,
                InvestorNotificationTypes::WITHDRAWAL_REJECTED,
                'Withdrawal rejected',
                $body,
                [
                    'withdrawal_id' => $withdrawal->id,
                    'transaction_type' => 'withdrawal',
                    'transaction_status' => 'rejected',
                    'reference' => $withdrawal->reference ?? sprintf('OGWITH-INV-%03d', $withdrawal->id),
                    'href' => "/invest/transactions/withdrawal/{$withdrawal->id}",
                ],
                'withdraw_rejected',
                [
                    'withdraw_id' => $withdrawal->reference ?? sprintf('OGWITH-INV-%03d', $withdrawal->id),
                    'amount' => $amount,
                    'currency' => strtoupper(is_array($withdrawal->bank_details) ? ($withdrawal->bank_details['currency'] ?? 'USD') : 'USD'),
                    'notes' => $note ?? '',
                    'portal_url' => config('app.frontend_url', config('app.url'))."/invest/transactions/withdrawal/{$withdrawal->id}",
                ]
            );
        }

        return response()->json([
            'message' => 'Withdrawal rejected.',
            'data' => $withdrawal,
        ]);
    }

    public function transactions(Request $request): JsonResponse
    {
        $query = WalletTransaction::query()->with([
            'wallet:id,user_id,currency',
            'wallet.user:id,name,email',
            'wallet.user.profile:id,user_id,country',
        ]);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        $paginator = $query->latest()->paginate($this->perPage($request));
        $paginator->getCollection()->transform(function (WalletTransaction $transaction) {
            $data = $transaction->toArray();
            $user = $transaction->wallet?->user;
            $data['wallet'] = $transaction->wallet ? [
                'id' => $transaction->wallet->id,
                'currency' => $transaction->wallet->currency,
                'user' => UserDisplayCurrency::userPayload($user),
            ] : null;

            return $data;
        });

        return response()->json($paginator);
    }

    public function platformWallet(): JsonResponse
    {
        $wallet = PlatformWalletService::ensure('USD');
        $wallet->refresh();

        $activeInvestments = Investment::query()
            ->where('status', 'active')
            ->with('project:id,expected_return_pct')
            ->get(['id', 'amount', 'project_id']);

        $activeInvestmentsTotal = round((float) $activeInvestments->sum('amount'), 2);

        $pendingReturnsTotal = round($activeInvestments->sum(function (Investment $investment) {
            $invested = (float) $investment->amount;
            $roiPct = (float) ($investment->project?->expected_return_pct ?: 0);
            $profit = round($invested * ($roiPct / 100), 2);

            return $invested + $profit;
        }), 2);

        return response()->json([
            'data' => [
                'balance' => (float) $wallet->balance,
                'currency' => $wallet->currency,
                'active_investments_total' => $activeInvestmentsTotal,
                'pending_returns_total' => $pendingReturnsTotal,
            ],
        ]);
    }

    public function platformWalletTransactions(Request $request): JsonResponse
    {
        $wallet = PlatformWalletService::ensure('USD');

        $query = $wallet->transactions()->latest();

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        $paginator = $query->paginate($this->perPage($request));

        return response()->json($paginator);
    }

    public function bankAccounts(): JsonResponse
    {
        return response()->json(['data' => BankAccount::query()->latest()->get()]);
    }

    public function publicBankAccounts(): JsonResponse
    {
        return response()->json([
            'data' => BankAccount::query()
                ->where('is_active', true)
                ->orderByDesc('is_default')
                ->latest()
                ->get(),
        ]);
    }

    public function storeBankAccount(Request $request): JsonResponse
    {
        $data = $request->validate([
            'bank_name' => ['required', 'string', 'max:255'],
            'account_title' => ['required', 'string', 'max:255'],
            'account_number' => ['required', 'string', 'max:100'],
            'iban' => ['nullable', 'string', 'max:100'],
            'swift' => ['nullable', 'string', 'max:50'],
            'currency' => ['nullable', 'string', 'max:10'],
            'is_active' => ['nullable', 'boolean'],
            'is_default' => ['nullable', 'boolean'],
            'instructions' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        if (! empty($data['is_default'])) {
            BankAccount::query()->update(['is_default' => false]);
        }

        return response()->json(['data' => BankAccount::create($data)], 201);
    }

    public function updateBankAccount(Request $request, int $id): JsonResponse
    {
        $account = BankAccount::query()->findOrFail($id);

        $data = $request->validate([
            'bank_name' => ['sometimes', 'string', 'max:255'],
            'account_title' => ['sometimes', 'string', 'max:255'],
            'account_number' => ['sometimes', 'string', 'max:100'],
            'iban' => ['nullable', 'string', 'max:100'],
            'swift' => ['nullable', 'string', 'max:50'],
            'currency' => ['nullable', 'string', 'max:10'],
            'is_active' => ['nullable', 'boolean'],
            'is_default' => ['nullable', 'boolean'],
            'instructions' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        if (! empty($data['is_default'])) {
            BankAccount::query()->where('id', '!=', $account->id)->update(['is_default' => false]);
        }

        $account->update($data);

        return response()->json(['data' => $account->fresh()]);
    }

    public function destroyBankAccount(int $id): JsonResponse
    {
        BankAccount::query()->findOrFail($id)->delete();

        return response()->json(['message' => 'Bank account deleted.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function transformDeposit(Deposit $deposit): array
    {
        $bankAccount = $deposit->bankAccount;

        return [
            'id' => $deposit->id,
            'investor_id' => $deposit->investor_id,
            'amount' => $deposit->amount,
            'currency' => $deposit->currency,
            'amount_usd' => $deposit->amount_usd,
            'usd_exchange_rate' => $deposit->usd_exchange_rate,
            'converted_amount' => $deposit->converted_amount,
            'exchange_rate' => $deposit->exchange_rate,
            'wallet_currency' => $deposit->wallet_currency,
            'method' => $deposit->method,
            'reference' => $deposit->reference,
            'bank_reference' => $deposit->bank_reference,
            'bank_account_id' => $deposit->bank_account_id,
            'bank_account_name' => $deposit->bank_account_name,
            'admin_bank_account' => [
                'bank_name' => $bankAccount?->bank_name ?? $deposit->bank_account_name,
                'account_number' => $bankAccount?->account_number,
            ],
            'status' => $deposit->status,
            'project_id' => $deposit->project_id,
            'proof_path' => $deposit->proof_path,
            'proof_url' => MediaStorage::url($deposit->proof_path),
            'reviewed_by' => $deposit->reviewed_by,
            'reviewed_at' => $deposit->reviewed_at?->toIso8601String(),
            'note' => $deposit->note,
            'created_at' => $deposit->created_at?->toIso8601String(),
            'updated_at' => $deposit->updated_at?->toIso8601String(),
            'investor' => UserDisplayCurrency::userPayload($deposit->investor),
            'project' => $deposit->project,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformWithdrawal(Withdrawal $withdrawal): array
    {
        $bankDetails = is_array($withdrawal->bank_details) ? $withdrawal->bank_details : [];

        return [
            'id' => $withdrawal->id,
            'investor_id' => $withdrawal->investor_id,
            'amount' => $withdrawal->amount,
            'amount_usd' => $withdrawal->amount_usd,
            'exchange_rate' => $withdrawal->exchange_rate,
            'fee' => $withdrawal->fee !== null ? (float) $withdrawal->fee : 0.0,
            'fee_usd' => $withdrawal->fee_usd !== null ? (float) $withdrawal->fee_usd : 0.0,
            'total_debit' => $withdrawal->total_debit !== null
                ? (float) $withdrawal->total_debit
                : (float) $withdrawal->amount,
            'total_debit_usd' => $withdrawal->total_debit_usd !== null
                ? (float) $withdrawal->total_debit_usd
                : ($withdrawal->amount_usd !== null ? (float) $withdrawal->amount_usd : null),
            'bank_details' => $bankDetails,
            'reference' => $withdrawal->reference,
            'status' => $withdrawal->status,
            'note' => $withdrawal->note,
            'reviewed_by' => $withdrawal->reviewed_by,
            'reviewed_at' => $withdrawal->reviewed_at?->toIso8601String(),
            'created_at' => $withdrawal->created_at?->toIso8601String(),
            'updated_at' => $withdrawal->updated_at?->toIso8601String(),
            'investor' => UserDisplayCurrency::userPayload($withdrawal->investor),
            'wallet_currency' => UserDisplayCurrency::currencyForUser($withdrawal->investor),
        ];
    }
}
