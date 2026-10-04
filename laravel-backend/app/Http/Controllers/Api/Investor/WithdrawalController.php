<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Api\SecurityController;
use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Withdrawal;
use App\Support\ExchangeRateService;
use App\Support\UserDisplayCurrency;
use App\Support\WalletReservation;
use App\Services\NotificationMailer;
use App\Support\InvestorBankAccounts;
use App\Support\InvestorMarket;
use App\Support\InvestorNotificationTypes;
use App\Support\AdminNotificationTypes;
use App\Support\NotifiesAdmins;
use App\Support\NotifiesUsers;
use App\Services\InvestorTransactionPdfGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class WithdrawalController extends Controller
{
    use PaginatesQueries;

    private const OTP_EXPIRY_MINUTES = 10;

    public function index(Request $request): JsonResponse
    {
        $query = Withdrawal::query()->where('investor_id', $request->user()->id);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $paginator = $query->latest()->paginate($this->perPage($request));
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

        NotificationMailer::sendTemplated($user, 'withdraw_otp', [
            'otp_code' => $code,
            'expires_minutes' => (string) self::OTP_EXPIRY_MINUTES,
        ]) || NotificationMailer::sendRaw(
            $user,
            config('app.display_name', 'OG Exports').' — Withdrawal Verification Code',
            "Your withdrawal verification code is: {$code}\n\nThis code expires in ".self::OTP_EXPIRY_MINUTES.' minutes.'
        );

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
            'bank_details' => ['nullable', 'array'],
            'note' => ['nullable', 'string'],
            'otp' => ['required', 'string', 'size:6'],
            'transaction_password' => ['required', 'string'],
            'save_bank_details' => ['nullable', 'boolean'],
        ]);

        /** @var User $user */
        $user = $request->user()->fresh();
        $this->verifyWithdrawOtp($user, $data['otp']);
        SecurityController::verifyTransactionPassword($user, $data['transaction_password']);

        $amount = (float) $data['amount'];
        $amountUsd = null;
        $exchangeRate = null;

        if (UserDisplayCurrency::isPkrUser($user)) {
            $snapshot = ExchangeRateService::pkrToUsdSnapshot($amount);
            $amountUsd = $snapshot['amount_usd'];
            $exchangeRate = $snapshot['exchange_rate'];
        }

        $walletCurrency = UserDisplayCurrency::currencyForUser($user);
        $bankDetails = is_array($data['bank_details'] ?? null) ? $data['bank_details'] : [];

        // Mobile clients may omit bank_details; use the profile default bank account.
        if ($bankDetails === [] || ! InvestorBankAccounts::isUsable(
            InvestorBankAccounts::normalizeAccount($bankDetails)
        )) {
            $user->loadMissing('profile');
            $meta = is_array($user->profile?->meta) ? $user->profile->meta : [];
            $default = InvestorBankAccounts::defaultAccount(
                InvestorBankAccounts::normalizeFromMeta($meta)
            );

            if ($default === null) {
                throw ValidationException::withMessages([
                    'bank_details' => ['Add a bank account in Settings before withdrawing.'],
                ]);
            }

            $bankDetails = [
                'bank_name' => $default['bank_name'] ?? '',
                'account_holder' => $default['account_holder'] ?? '',
                'account_number' => $default['account_number'] ?? '',
                'iban' => $default['iban'] ?? '',
                'swift' => $default['swift'] ?? '',
                'branch' => $default['branch'] ?? '',
                'currency' => $default['currency'] ?? $walletCurrency,
            ];
        }

        $bankDetails['currency'] = $walletCurrency;
        $data['bank_details'] = $bankDetails;

        $withdrawal = DB::transaction(function () use ($request, $data, $amount, $amountUsd, $exchangeRate, $user) {
            $withdrawal = Withdrawal::create([
                'investor_id' => $user->id,
                'amount' => $amount,
                'amount_usd' => $amountUsd,
                'exchange_rate' => $exchangeRate,
                'bank_details' => $data['bank_details'],
                'reference' => null,
                'status' => 'pending',
                'note' => $data['note'] ?? null,
            ]);

            $reference = sprintf('OGWITH-INV-%03d', $withdrawal->id);
            $withdrawal->update(['reference' => $reference]);

            WalletReservation::reserve(
                $user,
                $amount,
                'withdrawal',
                $reference,
                ['withdrawal_id' => $withdrawal->id],
            );

            if ($request->boolean('save_bank_details')) {
                $this->persistWithdrawBankDetails($user, $data['bank_details']);
            }

            $user->forceFill([
                'withdraw_otp_code' => null,
                'withdraw_otp_expires_at' => null,
            ])->save();

            return $withdrawal->fresh();
        });

        $currency = $walletCurrency;

        NotifiesUsers::notifyAndEmail(
            $user,
            InvestorNotificationTypes::WITHDRAWAL,
            'Withdrawal submitted — '.$withdrawal->reference,
            'Your withdrawal request is pending admin review.',
            ['withdrawal_id' => $withdrawal->id, 'href' => '/invest/withdraw'],
            'withdraw_submitted',
            [
                'withdraw_id' => $withdrawal->reference,
                'amount' => number_format($amount, 2),
                'currency' => $currency,
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
        $withdrawal = Withdrawal::query()
            ->where('investor_id', $request->user()->id)
            ->findOrFail($id);

        return response()->json(['data' => $this->transformWithdrawal($withdrawal)]);
    }

    public function pdf(Request $request, int $id, InvestorTransactionPdfGenerator $pdf): \Symfony\Component\HttpFoundation\Response
    {
        $withdrawal = Withdrawal::query()
            ->where('investor_id', $request->user()->id)
            ->findOrFail($id);

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
     * @param  array<string, mixed>  $bankDetails
     */
    private function persistWithdrawBankDetails(User $user, array $bankDetails): void
    {
        $profile = UserProfile::query()->firstOrCreate(['user_id' => $user->id]);
        $meta = is_array($profile->meta) ? $profile->meta : [];

        $accounts = InvestorBankAccounts::normalizeFromMeta($meta);
        $incoming = [
            'bank_name' => $bankDetails['bank_name'] ?? $bankDetails['bank'] ?? '',
            'account_holder' => $bankDetails['account_holder'] ?? '',
            'account_number' => $bankDetails['account_number'] ?? '',
            'iban' => $bankDetails['iban'] ?? '',
            'swift' => $bankDetails['swift'] ?? '',
            'branch' => $bankDetails['branch'] ?? '',
            'currency' => $bankDetails['currency'] ?? InvestorMarket::currencyForUser($user),
        ];

        $accounts = InvestorBankAccounts::upsertAccount($accounts, $incoming);

        // Keep legacy withdraw_bank in sync with the default account for older clients.
        $default = InvestorBankAccounts::defaultAccount($accounts);
        if ($default !== null) {
            $meta['withdraw_bank'] = [
                'bank_name' => $default['bank_name'] ?? '',
                'account_holder' => $default['account_holder'] ?? '',
                'account_number' => $default['account_number'] ?? '',
                'iban' => $default['iban'] ?? '',
                'swift' => $default['swift'] ?? '',
                'branch' => $default['branch'] ?? '',
                'currency' => $default['currency'] ?? InvestorMarket::currencyForUser($user),
            ];
        }

        $meta['bank_accounts'] = $accounts;
        $profile->update(['meta' => $meta]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transformWithdrawal(Withdrawal $withdrawal): array
    {
        return [
            'id' => $withdrawal->id,
            'withdraw_id' => $withdrawal->reference ?: sprintf('OGWITH-INV-%03d', $withdrawal->id),
            'reference' => $withdrawal->reference ?: sprintf('OGWITH-INV-%03d', $withdrawal->id),
            'amount' => $withdrawal->amount,
            'amount_usd' => $withdrawal->amount_usd !== null ? (float) $withdrawal->amount_usd : null,
            'exchange_rate' => $withdrawal->exchange_rate !== null ? (float) $withdrawal->exchange_rate : null,
            'bank_details' => $withdrawal->bank_details,
            'status' => $withdrawal->status,
            'note' => $withdrawal->note,
            'created_at' => $withdrawal->created_at?->toIso8601String(),
            'reviewed_at' => $withdrawal->reviewed_at?->toIso8601String(),
        ];
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $visible = substr($local, 0, 2);

        return $visible.str_repeat('*', max(strlen($local) - 2, 1)).'@'.$domain;
    }
}
