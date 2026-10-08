<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\KycApplication;
use App\Models\KycDocument;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use App\Support\KycGate;
use App\Support\MediaStorage;
use App\Support\AdminNotificationTypes;
use App\Support\InvestorBankAccountPresenter;
use App\Support\InvestorBankAccounts;
use App\Support\NotifiesAdmins;
use App\Support\WalletCurrencyService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    /** @var list<string> */
    public const KYC_STEPS = [
        'passport_id',
        'proof_of_address',
        'tax_certificate',
    ];

    private const STEP_LABELS = [
        'passport_id' => 'Passport / National ID',
        'proof_of_address' => 'Proof of Address',
        'tax_certificate' => 'Tax Certificate / NTN',
    ];

    private const STEP_DESCS = [
        'passport_id' => 'Government-issued ID (CNIC, Passport, or National ID)',
        'proof_of_address' => 'Utility bill, bank statement, or official letter (last 3 months)',
        'tax_certificate' => 'Tax certificate, NTN, or equivalent tax registration',
    ];

    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load(['profile', 'roles', 'latestKycApplication.documents']);
        $meta = is_array($user->profile?->meta) ? $user->profile->meta : [];
        $kyc = $this->buildKycSteps($user);
        $bankAccounts = InvestorBankAccounts::normalizeFromMeta($meta);
        $publicBankAccounts = InvestorBankAccountPresenter::presentAll($user->id, $bankAccounts);
        $defaultBankAccount = collect($publicBankAccounts)->first(fn (array $account): bool => $account['is_default'])
            ?? ($publicBankAccounts[0] ?? null);

        return response()->json([
            'data' => [
                'user' => (new UserResource($user))->resolve($request),
                'personal' => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'dob' => $meta['dob'] ?? null,
                    'nationality' => $meta['nationality'] ?? null,
                    'cnic' => $meta['cnic'] ?? null,
                ],
                'company' => [
                    'company_name' => $user->profile?->company_name,
                    'company_type' => $meta['company_type'] ?? null,
                    'registration_no' => $meta['registration_no'] ?? null,
                    'industry' => $meta['industry'] ?? null,
                    'founded' => $meta['founded'] ?? null,
                    'revenue' => $meta['revenue'] ?? null,
                    'employees' => $meta['employees'] ?? null,
                    'website' => $meta['website'] ?? null,
                ],
                'address' => [
                    'address' => $user->profile?->address,
                    'city' => $user->profile?->city,
                    'country' => $user->profile?->country,
                    'province' => $meta['province'] ?? null,
                    'postal_code' => $meta['postal_code'] ?? null,
                    'address_line2' => $meta['address_line2'] ?? null,
                ],
                'tax' => $meta['tax'] ?? [],
                'bank' => $this->publicLegacyBank($meta['bank'] ?? []),
                'withdraw_bank' => $this->publicLegacyBank($meta['withdraw_bank'] ?? []),
                'bank_accounts' => $publicBankAccounts,
                'default_bank_account' => $defaultBankAccount,
                'risk_profile' => $meta['risk_profile'] ?? 'Balanced',
                'kyc' => $kyc,
                'verification_pct' => $this->verificationPct($kyc['steps']),
                'notification_prefs' => $meta['notification_prefs'] ?? [],
                'preferences' => $meta['preferences'] ?? [],
                'account_status' => $user->account_status,
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:500'],
            'avatar_url' => ['nullable', 'string', 'max:1000'],
            'dob' => ['nullable', 'string', 'max:50'],
            'nationality' => ['nullable', 'string', 'max:100'],
            'cnic' => ['nullable', 'string', 'max:100'],
            'company_type' => ['nullable', 'string', 'max:100'],
            'registration_no' => ['nullable', 'string', 'max:100'],
            'industry' => ['nullable', 'string', 'max:100'],
            'founded' => ['nullable', 'string', 'max:50'],
            'revenue' => ['nullable', 'string', 'max:100'],
            'employees' => ['nullable', 'string', 'max:50'],
            'website' => ['nullable', 'string', 'max:255'],
            'province' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:30'],
            'address_line2' => ['nullable', 'string', 'max:500'],
            'tax' => ['nullable', 'array'],
            'bank' => ['nullable', 'array'],
            'withdraw_bank' => ['nullable', 'array'],
            'bank_accounts' => ['nullable', 'array'],
            'bank_accounts.*.id' => ['nullable', 'string', 'max:64'],
            'bank_accounts.*.bank_name' => ['nullable', 'string', 'max:255'],
            'bank_accounts.*.account_holder' => ['nullable', 'string', 'max:255'],
            'bank_accounts.*.account_number' => ['nullable', 'string', 'max:100'],
            'bank_accounts.*.iban' => ['nullable', 'string', 'max:100'],
            'bank_accounts.*.swift' => ['nullable', 'string', 'max:50'],
            'bank_accounts.*.branch' => ['nullable', 'string', 'max:255'],
            'bank_accounts.*.currency' => ['nullable', 'string', 'max:10'],
            'bank_accounts.*.is_default' => ['nullable', 'boolean'],
            'risk_profile' => ['nullable', 'string', 'max:50'],
            'notification_prefs' => ['nullable', 'array'],
            'preferences' => ['nullable', 'array'],
            'preferences.currency' => ['sometimes', 'string', Rule::in(['USD', 'PKR', 'EUR', 'GBP'])],
            'account_status' => ['sometimes', 'string', Rule::in(['active', 'suspended'])],
            'meta' => ['nullable', 'array'],
        ]);

        $walletCurrencyChange = null;
        DB::transaction(function () use ($user, $data, &$walletCurrencyChange): void {
            $userFill = collect($data)->only(['name', 'phone'])->all();
            if (array_key_exists('account_status', $data)) {
                $userFill['account_status'] = $data['account_status'];
            }
            if ($userFill !== []) {
                $user->fill($userFill)->save();
            }

            $profile = $user->profile()->firstOrCreate(['user_id' => $user->id]);
            $meta = is_array($profile->meta) ? $profile->meta : [];

            foreach ([
                'dob', 'nationality', 'cnic', 'company_type', 'registration_no', 'industry',
                'founded', 'revenue', 'employees', 'website', 'province', 'postal_code',
                'address_line2', 'risk_profile',
            ] as $key) {
                if (array_key_exists($key, $data)) {
                    $meta[$key] = $data[$key];
                }
            }
            if (array_key_exists('tax', $data)) {
                $meta['tax'] = $data['tax'];
            }
            if (array_key_exists('bank', $data)) {
                $meta['bank'] = $data['bank'];
            }
            if (array_key_exists('withdraw_bank', $data)) {
                $meta['withdraw_bank'] = $data['withdraw_bank'];
                $meta['bank_accounts'] = InvestorBankAccounts::upsertAccount(
                    InvestorBankAccounts::normalizeFromMeta($meta),
                    is_array($data['withdraw_bank']) ? $data['withdraw_bank'] : []
                );
            }
            if (array_key_exists('bank_accounts', $data)) {
                $meta['bank_accounts'] = InvestorBankAccounts::sanitizeForStorage(
                    is_array($data['bank_accounts']) ? $data['bank_accounts'] : []
                );
                $default = InvestorBankAccounts::defaultAccount($meta['bank_accounts']);
                if ($default !== null) {
                    $meta['withdraw_bank'] = [
                        'bank_name' => $default['bank_name'] ?? '',
                        'account_holder' => $default['account_holder'] ?? '',
                        'account_number' => $default['account_number'] ?? '',
                        'iban' => $default['iban'] ?? '',
                        'swift' => $default['swift'] ?? '',
                        'branch' => $default['branch'] ?? '',
                        'currency' => $default['currency'] ?? 'USD',
                    ];
                }
            }
            if (array_key_exists('notification_prefs', $data)) {
                $meta['notification_prefs'] = array_merge($meta['notification_prefs'] ?? [], $data['notification_prefs'] ?? []);
            }
            if (array_key_exists('preferences', $data)) {
                $meta['preferences'] = array_merge($meta['preferences'] ?? [], $data['preferences'] ?? []);
            }
            if (! empty($data['meta']) && is_array($data['meta'])) {
                $meta = array_replace_recursive($meta, $data['meta']);
            }

            if (isset($data['preferences']['currency']) && $user->hasRole('investor')) {
                $walletCurrencyChange = app(WalletCurrencyService::class)->change(
                    $user,
                    $data['preferences']['currency'],
                );
            }

            $profile->fill(collect($data)->only([
                'company_name', 'country', 'city', 'address', 'avatar_url',
            ])->all());
            $profile->meta = $meta;
            $profile->save();
        });

        return response()->json([
            'message' => 'Profile updated.',
            'data' => $this->show($request)->getData(true)['data'],
            'wallet_currency_change' => $walletCurrencyChange,
        ]);
    }

    public function kycUpload(Request $request): JsonResponse
    {
        abort_unless(Schema::hasTable('kyc_applications') && Schema::hasTable('kyc_documents'), 503);

        $data = $request->validate([
            'doc_type' => ['required', 'string', Rule::in(self::KYC_STEPS)],
            'path' => ['required', 'string', 'max:1000'],
            'original_name' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $kyc = KycApplication::query()
            ->where('user_id', $user->id)
            ->whereIn('type', ['investor', 'individual', 'company'])
            ->latest('created_at')
            ->orderByDesc('id')
            ->first();

        if ($kyc && $kyc->status === 'approved') {
            KycDocument::query()
                ->where('kyc_application_id', $kyc->id)
                ->where('doc_type', $data['doc_type'])
                ->delete();

            $doc = KycDocument::create([
                'kyc_application_id' => $kyc->id,
                'doc_type' => $data['doc_type'],
                'path' => $data['path'],
                'original_name' => $data['original_name'] ?? null,
            ]);

            return response()->json([
                'message' => 'Document updated on approved KYC application.',
                'data' => [
                    'document' => $doc,
                    'kyc' => $this->buildKycSteps($user),
                ],
            ], 201);
        }

        if (! $kyc || $kyc->status === 'rejected') {
            $kyc = KycApplication::create([
                'user_id' => $user->id,
                'type' => 'investor',
                'country' => $user->profile?->country,
                'status' => 'pending',
                'submitted_at' => now(),
                'payload' => ['source' => 'investor_profile'],
            ]);
        } else {
            $kyc->update([
                'status' => 'pending',
                'submitted_at' => now(),
            ]);
        }

        KycDocument::query()
            ->where('kyc_application_id', $kyc->id)
            ->where('doc_type', $data['doc_type'])
            ->delete();

        $doc = KycDocument::create([
            'kyc_application_id' => $kyc->id,
            'doc_type' => $data['doc_type'],
            'path' => $data['path'],
            'original_name' => $data['original_name'] ?? null,
        ]);

        NotifiesAdmins::notify(
            AdminNotificationTypes::KYC_SUBMITTED,
            'KYC document uploaded: '.$user->name,
            'Investor uploaded '.($data['doc_type']).' for review.',
            ['href' => '/admin/compliance', 'user_id' => $user->id, 'kyc_id' => $kyc->id]
        );

        return response()->json([
            'message' => 'Document uploaded for review.',
            'data' => [
                'document' => $doc,
                'kyc' => $this->buildKycSteps($user),
            ],
        ], 201);
    }

    /**
     * @return array{status: string, application_id: ?int, application: ?array<string, mixed>, steps: list<array<string, mixed>>}
     */
    private function buildKycSteps(User $user): array
    {
        if (! Schema::hasTable('kyc_applications') || ! Schema::hasTable('kyc_documents')) {
            return [
                'status' => KycGate::status($user),
                'application_id' => null,
                'application' => null,
                'steps' => $this->emptyKycSteps(),
            ];
        }

        $kyc = KycApplication::query()
            ->where('user_id', $user->id)
            ->whereIn('type', ['investor', 'individual', 'company'])
            ->with('documents')
            ->latest('created_at')
            ->orderByDesc('id')
            ->first();

        $docsByType = collect($kyc?->documents ?? [])->keyBy('doc_type');
        // Canonical status (application record OR profile.meta.kyc flags)
        $appStatus = KycGate::status($user);

        $steps = [];
        foreach (self::KYC_STEPS as $type) {
            $doc = $docsByType->get($type);
            $status = 'pending';
            $desc = (self::STEP_DESCS[$type] ?? $type).' required';

            if ($doc) {
                if ($appStatus === 'approved') {
                    $status = 'verified';
                    $desc = (self::STEP_DESCS[$type] ?? $type).' submitted and verified';
                } elseif ($appStatus === 'rejected') {
                    $status = 'pending';
                    $desc = 'Rejected — please re-upload '.(self::STEP_DESCS[$type] ?? $type);
                } else {
                    $status = 'review';
                    $desc = (self::STEP_DESCS[$type] ?? $type).' under compliance review';
                }
            }

            $url = null;
            if ($doc?->path) {
                try {
                    $url = MediaStorage::url($doc->path);
                } catch (\Throwable) {
                    $url = null;
                }
            }

            $steps[] = [
                'key' => $type,
                'doc_type' => $type,
                'label' => self::STEP_LABELS[$type] ?? $type,
                'status' => $status,
                'desc' => $desc,
                'uploaded_at' => $doc?->created_at?->toDateString(),
                'document_id' => $doc?->id,
                'document' => $doc ? [
                    'id' => $doc->id,
                    'path' => $doc->path,
                    'url' => $url,
                    'original_name' => $doc->original_name,
                ] : null,
            ];
        }

        return [
            'status' => $appStatus,
            'application_id' => $kyc?->id,
            'application' => $kyc ? [
                'id' => $kyc->id,
                'status' => $kyc->status,
                'submitted_at' => $kyc->submitted_at?->toIso8601String(),
                'reviewed_at' => $kyc->reviewed_at?->toIso8601String(),
                'notes' => $kyc->notes,
            ] : null,
            'steps' => $steps,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function emptyKycSteps(): array
    {
        $steps = [];
        foreach (self::KYC_STEPS as $type) {
            $steps[] = [
                'key' => $type,
                'doc_type' => $type,
                'label' => self::STEP_LABELS[$type] ?? $type,
                'status' => 'pending',
                'desc' => (self::STEP_DESCS[$type] ?? $type).' required',
                'uploaded_at' => null,
                'document_id' => null,
                'document' => null,
            ];
        }

        return $steps;
    }

    private function verificationPct(array $steps): int
    {
        if ($steps === []) {
            return 0;
        }

        $done = collect($steps)->filter(
            fn ($s) => in_array($s['status'] ?? '', ['verified', 'review'], true)
        )->count();

        return (int) round(($done / count($steps)) * 100);
    }

    /**
     * @return array<string, mixed>
     */
    private function publicLegacyBank(mixed $bank): array
    {
        if (! is_array($bank)) {
            return [];
        }

        $account = InvestorBankAccounts::normalizeAccount($bank);
        if (! InvestorBankAccounts::isUsable($account)) {
            return [];
        }

        return InvestorBankAccountPresenter::presentOne($account);
    }
}
