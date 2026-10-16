<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\Deposit;
use App\Support\DepositReferenceGenerator;
use App\Support\DepositReviewStatuses;
use App\Support\ExchangeRateService;
use App\Support\FinancialTransactionIdResolver;
use App\Support\MediaStorage;
use App\Support\UserDisplayCurrency;
use App\Support\AdminNotificationTypes;
use App\Support\InvestorNotificationTypes;
use App\Support\NotifiesAdmins;
use App\Support\NotifiesUsers;
use App\Services\InvestorTransactionPdfGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DepositController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'reference' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'max:40'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d'],
        ]);

        if (
            filled($filters['date_from'] ?? null)
            && filled($filters['date_to'] ?? null)
            && $filters['date_to'] < $filters['date_from']
        ) {
            throw ValidationException::withMessages([
                'date_to' => 'The end date must be on or after the start date.',
            ]);
        }

        $query = Deposit::query()
            ->where('investor_id', $request->user()->id)
            ->with('project');

        if ($reference = trim((string) ($filters['reference'] ?? ''))) {
            $like = '%'.strtolower($reference).'%';
            $query->where(function ($referenceQuery) use ($like) {
                $referenceQuery
                    ->whereRaw('LOWER(reference) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(bank_reference) LIKE ?', [$like]);
            });
        }

        if ($status = trim((string) ($filters['status'] ?? ''))) {
            $normalizedStatus = DepositReviewStatuses::normalize($status);
            $storedStatuses = match ($normalizedStatus) {
                DepositReviewStatuses::PENDING => ['pending', 'pending_verification'],
                DepositReviewStatuses::APPROVED => ['approved', 'paid', 'partial'],
                DepositReviewStatuses::CANCELLED => ['cancelled', 'canceled'],
                default => [$normalizedStatus],
            };
            $query->whereIn('status', $storedStatuses);
        }

        if (filled($filters['date_from'] ?? null)) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (filled($filters['date_to'] ?? null)) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        $deposits = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($this->perPage($request));
        $deposits->setCollection(
            $deposits->getCollection()->map(function (Deposit $deposit) {
                $row = $deposit->toArray();
                $row['review_status'] = DepositReviewStatuses::normalize($deposit->status);
                $row['review_status_label'] = DepositReviewStatuses::label($deposit->status);
                $row['original_amount'] = (float) $deposit->amount;
                $row['original_currency'] = $deposit->currency;
                $row['amount_usd'] = $deposit->amount_usd !== null
                    ? (float) $deposit->amount_usd
                    : null;
                $row['usd_exchange_rate'] = $deposit->usd_exchange_rate !== null
                    ? (float) $deposit->usd_exchange_rate
                    : null;
                $row['converted_amount'] = $deposit->converted_amount !== null
                    ? (float) $deposit->converted_amount
                    : null;
                $row['wallet_currency'] = $deposit->wallet_currency;

                return $row;
            })
        );

        return response()->json($deposits);
    }

    public function paymentBankAccounts(): JsonResponse
    {
        return response()->json([
            'data' => BankAccount::query()
                ->where('is_active', true)
                ->orderByDesc('is_default')
                ->latest()
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $walletCurrency = UserDisplayCurrency::currencyForUser($request->user());
        if ($walletCurrency !== 'USD') {
            throw ValidationException::withMessages([
                'currency' => ['Deposits are only available once your wallet has been converted to USD.'],
            ]);
        }

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'currency' => ['nullable', 'string', Rule::in(['USD'])],
            'method' => ['nullable', 'string', 'max:50'],
            'bank_reference' => ['nullable', 'string', 'max:255'],
            // Legacy clients may still send `reference` as the bank transfer ref.
            'reference' => ['nullable', 'string', 'max:255'],
            'project_id' => ['nullable', 'exists:investment_projects,id'],
            'proof_path' => ['nullable', 'string', 'max:1000'],
            'bank_account_id' => ['nullable', 'integer', 'exists:bank_accounts,id'],
            'bank_account_name' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string'],
        ]);

        // Mobile clients may omit currency; new investor deposits are USD-only.
        if (empty($data['currency'])) {
            $data['currency'] = 'USD';
        }

        if (! empty($data['bank_account_id'])) {
            $bankAccount = BankAccount::query()
                ->where('id', $data['bank_account_id'])
                ->where('is_active', true)
                ->first();

            if (! $bankAccount) {
                return response()->json([
                    'message' => 'The selected bank account is not available.',
                    'errors' => ['bank_account_id' => ['The selected bank account is not available.']],
                ], 422);
            }

            $data['bank_account_name'] = $data['bank_account_name'] ?? $bankAccount->bank_name;
        }

        $bankReference = $data['bank_reference']
            ?? $data['reference']
            ?? null;

        $currency = strtoupper($data['currency']);
        $snapshot = ExchangeRateService::toUsdSnapshot((float) $data['amount'], $currency);
        $amountUsd = $currency === 'USD' ? null : $snapshot['amount_usd'];
        $usdExchangeRate = $currency === 'USD' ? null : $snapshot['exchange_rate'];

        $deposit = Deposit::create([
            'investor_id' => $request->user()->id,
            'amount' => $data['amount'],
            'currency' => $currency,
            'amount_usd' => $amountUsd,
            'usd_exchange_rate' => $usdExchangeRate,
            // Mirror locked PKR-per-USD rate so it is visible before approval.
            'exchange_rate' => $usdExchangeRate,
            'method' => $data['method'] ?? 'bank_transfer',
            'reference' => null,
            'bank_reference' => $bankReference,
            'status' => 'pending',
            'project_id' => $data['project_id'] ?? null,
            'proof_path' => $data['proof_path'] ?? null,
            'bank_account_id' => $data['bank_account_id'] ?? null,
            'bank_account_name' => $data['bank_account_name'] ?? null,
            'note' => $data['note'] ?? null,
        ]);

        $deposit->load('project');
        DepositReferenceGenerator::assign($deposit);

        if ($deposit->proof_path) {
            $movedPath = MediaStorage::moveDepositProof(
                $deposit->proof_path,
                $deposit->id,
                $request->user()->id,
            );

            if ($movedPath !== null && $movedPath !== $deposit->proof_path) {
                $deposit->update(['proof_path' => $movedPath]);
            }
        }

        $amount = number_format((float) $deposit->amount, 2);
        $currency = strtoupper($deposit->currency ?: 'USD');
        $href = $deposit->project_id
            ? '/admin/project-deposits'
            : '/admin/finance?tab=investor-deposits';

        NotifiesAdmins::notify(
            AdminNotificationTypes::DEPOSIT_SUBMITTED,
            "New deposit request: {$currency} {$amount}",
            ($request->user()->name ?? 'Investor').' submitted a deposit for review.',
            [
                'href' => $href,
                'deposit_id' => $deposit->id,
                'user_id' => $request->user()->id,
            ]
        );

        $reference = $deposit->reference ?? sprintf('OGDEP-INV-%03d', $deposit->id);
        NotifiesUsers::notify(
            $request->user(),
            InvestorNotificationTypes::DEPOSIT_SUBMITTED,
            "Deposit submitted — {$reference}",
            "Your deposit request for {$currency} {$amount} was submitted for review. It has not been approved or credited to your wallet.",
            [
                'deposit_id' => $deposit->id,
                'transaction_type' => 'deposit',
                'transaction_status' => 'pending',
                'reference' => $reference,
                'href' => "/invest/transactions/deposit/{$deposit->id}",
            ]
        );

        return response()->json([
            'message' => 'Deposit submitted for approval.',
            'data' => $deposit->fresh('project'),
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $deposit = FinancialTransactionIdResolver::findOrFail(
            Deposit::query()
                ->where('investor_id', $request->user()->id)
                ->with('project'),
            $id,
        );

        return response()->json(['data' => $deposit]);
    }

    public function pdf(Request $request, int $id, InvestorTransactionPdfGenerator $pdf): \Symfony\Component\HttpFoundation\Response
    {
        $deposit = FinancialTransactionIdResolver::findOrFail(
            Deposit::query()
                ->where('investor_id', $request->user()->id)
                ->with('project'),
            $id,
        );

        return $pdf->deposit($deposit, $request->user());
    }
}
