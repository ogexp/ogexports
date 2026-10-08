<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Api\SecurityController;
use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Withdrawal;
use App\Services\InvestorTransactionPdfGenerator;
use App\Services\NotificationMailer;
use App\Support\AdminNotificationTypes;
use App\Support\ExchangeRateService;
use App\Support\FinancialTransactionIdResolver;
use App\Support\InvestorBankAccountPresenter;
use App\Support\InvestorBankAccounts;
use App\Support\InvestorNotificationTypes;
use App\Support\InvestorWithdrawalBreakdown;
use App\Support\NotifiesAdmins;
use App\Support\NotifiesUsers;
use App\Support\UserDisplayCurrency;
use App\Support\WalletReservation;
use App\Support\WithdrawalTerms;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class WithdrawalController extends Controller
{
    use PaginatesQueries;

    private const OTP_EXPIRY_MINUTES = 10;

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', 'string', 'max:40'],
            'reference' => ['nullable', 'string', 'max:100'],
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

        $query = Withdrawal::query()->where('investor_id', $request->user()->id);

        if ($status = trim((string) ($filters['status'] ?? ''))) {
            $query->whereRaw('LOWER(status) = ?', [strtolower($status)]);
        }

        if ($reference = trim((string) ($filters['reference'] ?? ''))) {
            $query->whereRaw('LOWER(reference) LIKE ?', ['%'.strtolower($reference).'%']);
        }

        if (filled($filters['date_from'] ?? null)) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (filled($filters['date_to'] ?? null)) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        $paginator = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($this->perPage($request));
        $paginator->getCollection()->transform(fn (Withdrawal $w) => $this->transformWithdrawal($w));

        return response()->json($paginator);
    }

    public function sendOtp(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $code = (string) random_int(100000, 999999);
        $user->forceFill([
            'withdraw_otp_code' => Hash::make($code),
            'withdraw_otp_expires_at' => now()->addMinutes(self::OTP_EXPIRY_MINUTES),
        ])->save();

        $emailSent = NotificationMailer::sendTemplated($user, 'withdraw_otp', [
            'otp_code' => $code,
            'expires_minutes' => (string) self::OTP_EXPIRY_MINUTES,
        ]);

        if (! $emailSent) {
            $emailSent = NotificationMailer::sendRaw(
                $user,
                config('app.display_name', 'OG Exports').' — Withdrawal Verification Code',
                "Your withdrawal verification code is: {$code}\n\nThis code expires in ".self::OTP_EXPIRY_MINUTES.' minutes.'
            );
        }

        if (! $emailSent) {
            $user->refresh();
            if (filled($user->withdraw_otp_code) && Hash::check($code, $user->withdraw_otp_code)) {
                $user->forceFill([
                    'withdraw_otp_code' => null,
                    'withdraw_otp_expires_at' => null,
                ])->save();
            }

            return response()->json([
                'message' => 'We could not send your withdrawal verification code. Please try again later.',
            ], 503);
        }

        return response()->json([
            'message' => 'Verification code sent to your email.',
            'data' => [
                'email' => $this->maskEmail($user->email),
                'expires_minutes' => self::OTP_EXPIRY_MINUTES,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'bank_account_id' => ['nullable', 'string', 'max:64'],
            'bank_details' => ['nullable', 'array'],
            'note' => ['nullable', 'string'],
            'otp' => ['required', 'string', 'size:6'],
            'transaction_password' => ['required', 'string'],
            'save_bank_details' => ['nullable', 'boolean'],
        ]);

        /** @var User $user */
        $user = $request->user()->fresh();
        $amount = round((float) $data['amount'], 2);
        $amountUsd = null;
        $exchangeRate = null;

        if (UserDisplayCurrency::isPkrUser($user)) {
            $snapshot = ExchangeRateService::pkrToUsdSnapshot($amount);
            $amountUsd = $snapshot['amount_usd'];
            $exchangeRate = $snapshot['exchange_rate'];
        }

        $walletCurrency = UserDisplayCurrency::currencyForUser($user);
        $minimumWithdrawalUsd = round((float) config('withdrawal.minimum_usd', 100), 2);
        $amountUsdForMinimum = $amountUsd ?? $amount;

        if ($amountUsdForMinimum < $minimumWithdrawalUsd) {
            $message = sprintf(
                'The payout amount must be at least USD %s. The withdrawal fee is added separately.',
                number_format($minimumWithdrawalUsd, 2, '.', ','),
            );

            throw ValidationException::withMessages(['amount' => [$message]]);
        }

        $this->verifyWithdrawOtp($user, $data['otp']);
        SecurityController::verifyTransactionPassword($user, $data['transaction_password']);

        $withdrawalTerms = WithdrawalTerms::forCurrency($walletCurrency, $exchangeRate);
        $fee = $withdrawalTerms['fee'];
        $feeUsd = $withdrawalTerms['fee_usd'];
        $totalDebit = round($amount + $fee, 2);
        $totalDebitUsd = $amountUsd !== null
            ? round($amountUsd + $feeUsd, 2)
            : ($walletCurrency === 'USD' ? $totalDebit : null);
        $user->loadMissing('profile');
        $meta = is_array($user->profile?->meta) ? $user->profile->meta : [];
        $accounts = InvestorBankAccounts::normalizeFromMeta($meta);
        $bankDetails = $this->verifiedBankAccountDetails($user, $accounts, $data, $walletCurrency);

        $bankDetails['currency'] = $walletCurrency;
        $bankDetails['payment_method'] = 'Bank Transfer';
        $data['bank_details'] = $bankDetails;

        $withdrawal = DB::transaction(function () use ($data, $amount, $amountUsd, $exchangeRate, $fee, $feeUsd, $totalDebit, $totalDebitUsd, $walletCurrency, $user) {
            $withdrawal = Withdrawal::create([
                'investor_id' => $user->id,
                'amount' => $amount,
                'amount_usd' => $amountUsd,
                'exchange_rate' => $exchangeRate,
                'fee' => $fee,
                'fee_usd' => $feeUsd,
                'total_debit' => $totalDebit,
                'total_debit_usd' => $totalDebitUsd,
                'bank_details' => $data['bank_details'],
                'reference' => null,
                'status' => 'pending',
                'note' => $data['note'] ?? null,
            ]);

            $reference = sprintf('OGWITH-INV-%03d', $withdrawal->id);
            $withdrawal->update(['reference' => $reference]);

            WalletReservation::reserve(
                $user,
                $totalDebit,
                'withdrawal',
                $reference,
                [
                    'withdrawal_id' => $withdrawal->id,
                    'payout_amount' => $amount,
                    'amount_usd' => $amountUsd,
                    'exchange_rate' => $exchangeRate,
                    'fee' => $fee,
                    'fee_usd' => $feeUsd,
                    'total_debit' => $totalDebit,
                    'total_debit_usd' => $totalDebitUsd,
                    'currency' => $walletCurrency,
                    'payment_method' => $data['bank_details']['payment_method'],
                ],
            );

            $user->forceFill([
                'withdraw_otp_code' => null,
                'withdraw_otp_expires_at' => null,
            ])->save();

            return $withdrawal->fresh();
        });

        $currency = $walletCurrency;

        NotifiesUsers::notifyAndEmail(
            $user,
            InvestorNotificationTypes::WITHDRAWAL_SUBMITTED,
            'Withdrawal submitted — '.$withdrawal->reference,
            'Your withdrawal request is pending admin review. It has not been approved or sent to your bank.',
            [
                'withdrawal_id' => $withdrawal->id,
                'transaction_type' => 'withdrawal',
                'transaction_status' => $withdrawal->status,
                'reference' => $withdrawal->reference,
                'href' => "/invest/transactions/withdrawal/{$withdrawal->id}",
            ],
            'withdraw_submitted',
            [
                'withdraw_id' => $withdrawal->reference,
                'amount' => number_format($amount, 2),
                'currency' => $currency,
                'portal_url' => config('app.frontend_url', config('app.url'))."/invest/transactions/withdrawal/{$withdrawal->id}",
            ]
        );

        NotifiesAdmins::notify(
            AdminNotificationTypes::WITHDRAWAL_SUBMITTED,
            'Withdrawal request: '.$currency.' '.number_format($amount, 2),
            $user->name.' submitted a withdrawal for review. Ref: '.$withdrawal->reference,
            [
                'href' => '/admin/pending-withdrawals',
                'withdrawal_id' => $withdrawal->id,
                'user_id' => $user->id,
            ]
        );

        return response()->json([
            'message' => 'Withdrawal requested.',
            'data' => $this->transformWithdrawal($withdrawal),
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $withdrawal = FinancialTransactionIdResolver::findOrFail(
            Withdrawal::query()->where('investor_id', $request->user()->id),
            $id,
        );

        return response()->json(['data' => $this->transformWithdrawal($withdrawal)]);
    }

    public function pdf(Request $request, int $id, InvestorTransactionPdfGenerator $pdf): Response
    {
        $withdrawal = FinancialTransactionIdResolver::findOrFail(
            Withdrawal::query()->where('investor_id', $request->user()->id),
            $id,
        );

        return $pdf->withdrawal($withdrawal, $request->user());
    }

    private function verifyWithdrawOtp(User $user, string $code): void
    {
        if (! $user->withdraw_otp_code || ! $user->withdraw_otp_expires_at || $user->withdraw_otp_expires_at->isPast()) {
            throw ValidationException::withMessages([
                'otp' => ['Verification code expired. Request a new one.'],
            ]);
        }

        if (! Hash::check($code, $user->withdraw_otp_code)) {
            throw ValidationException::withMessages([
                'otp' => ['Invalid verification code.'],
            ]);
        }
    }

    /**
     * Resolve account details on the server and reject unverified destinations.
     *
     * @param  list<array<string, mixed>>  $accounts
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function verifiedBankAccountDetails(User $user, array $accounts, array $data, string $currency): array
    {
        $account = null;
        $requestedId = trim((string) ($data['bank_account_id'] ?? ''));

        if ($requestedId !== '') {
            $account = collect($accounts)->first(
                fn (array $candidate): bool => (string) $candidate['id'] === $requestedId
            );
        } elseif (is_array($data['bank_details'] ?? null)
            && InvestorBankAccounts::isUsable(InvestorBankAccounts::normalizeAccount($data['bank_details']))) {
            // Keep compatibility with older clients, but resolve their details to a saved account.
            $incoming = InvestorBankAccounts::normalizeAccount($data['bank_details']);
            $account = collect($accounts)->first(
                fn (array $candidate): bool => InvestorBankAccounts::fingerprint($candidate)
                    === InvestorBankAccounts::fingerprint($incoming)
            );
        } else {
            $account = collect($accounts)->first(
                fn (array $candidate): bool => ! empty($candidate['is_default'])
                    && InvestorBankAccountPresenter::currentVerification($user->id, $candidate)?->status === 'verified'
            ) ?? collect($accounts)->first(
                fn (array $candidate): bool => InvestorBankAccountPresenter::currentVerification($user->id, $candidate)?->status === 'verified'
            );
        }

        if (! $account || InvestorBankAccountPresenter::currentVerification($user->id, $account)?->status !== 'verified') {
            throw ValidationException::withMessages([
                'bank_account_id' => ['Select a bank account currently verified by OG Exports before withdrawing.'],
            ]);
        }

        return [
            'bank_name' => $account['bank_name'],
            'account_holder' => $account['account_holder'],
            'account_number' => $account['account_number'],
            'iban' => $account['iban'],
            'swift' => $account['swift'],
            'branch' => $account['branch'],
            'currency' => $account['currency'] ?: $currency,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformWithdrawal(Withdrawal $withdrawal): array
    {
        $bankDetails = is_array($withdrawal->bank_details) ? $withdrawal->bank_details : [];
        $currency = strtoupper(trim((string) ($bankDetails['currency'] ?? '')));
        $needsStoredFallback = $currency === ''
            || $withdrawal->fee === null
            || $withdrawal->total_debit === null
            || ($currency === 'PKR' && (
                $withdrawal->amount_usd === null
                || $withdrawal->exchange_rate === null
                || $withdrawal->fee_usd === null
                || $withdrawal->total_debit_usd === null
            ));

        // Only legacy rows need a wallet-transaction lookup for recorded metadata.
        // Current rows already contain the full breakdown in the withdrawal columns.
        $breakdown = $needsStoredFallback
            ? InvestorWithdrawalBreakdown::fromWithdrawal($withdrawal)
            : [
                'payout_amount' => (float) $withdrawal->amount,
                'payout_amount_usd' => $withdrawal->amount_usd !== null ? (float) $withdrawal->amount_usd : null,
                'fee' => (float) $withdrawal->fee,
                'fee_usd' => $withdrawal->fee_usd !== null ? (float) $withdrawal->fee_usd : null,
                'total_debit' => (float) $withdrawal->total_debit,
                'total_debit_usd' => $withdrawal->total_debit_usd !== null ? (float) $withdrawal->total_debit_usd : null,
                'currency' => $currency,
                'exchange_rate' => $withdrawal->exchange_rate !== null ? (float) $withdrawal->exchange_rate : null,
            ];

        return [
            'id' => $withdrawal->id,
            'withdraw_id' => $withdrawal->reference ?: sprintf('OGWITH-INV-%03d', $withdrawal->id),
            'reference' => $withdrawal->reference ?: sprintf('OGWITH-INV-%03d', $withdrawal->id),
            'amount' => $breakdown['payout_amount'],
            'amount_usd' => $breakdown['payout_amount_usd'],
            'exchange_rate' => $breakdown['exchange_rate'],
            'fee' => $breakdown['fee'],
            'fee_usd' => $breakdown['fee_usd'],
            'total_debit' => $breakdown['total_debit'],
            'total_debit_usd' => $breakdown['total_debit_usd'],
            'currency' => $breakdown['currency'],
            'payment_method' => $this->withdrawalPaymentMethod($bankDetails),
            'withdrawal_fee' => $breakdown['fee'],
            'withdrawal_fee_usd' => $breakdown['fee_usd'],
            'estimated_processing_time' => (string) config('withdrawal.estimated_processing_time', '1 to 2 working days'),
            'bank_details' => InvestorBankAccountPresenter::maskBankDetails(
                is_array($withdrawal->bank_details) ? $withdrawal->bank_details : []
            ),
            'status' => $withdrawal->status,
            'note' => $withdrawal->note,
            'created_at' => $withdrawal->created_at?->toIso8601String(),
            'reviewed_at' => $withdrawal->reviewed_at?->toIso8601String(),
        ];
    }

    private function withdrawalPaymentMethod(array $bankDetails): string
    {
        $paymentMethod = trim((string) ($bankDetails['payment_method'] ?? $bankDetails['method'] ?? ''));
        if (in_array(mb_strtolower($paymentMethod), ['', '-', '—', '–', 'not recorded', 'not provided', 'not available', 'n/a'], true)) {
            return 'Bank Transfer';
        }

        return $paymentMethod;
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $visible = substr($local, 0, 2);

        return $visible.str_repeat('*', max(strlen($local) - 2, 1)).'@'.$domain;
    }
}
