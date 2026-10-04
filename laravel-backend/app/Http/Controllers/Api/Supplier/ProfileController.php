<?php

namespace App\Http\Controllers\Api\Supplier;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\KycApplication;
use App\Models\KycDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use App\Support\AdminNotificationTypes;
use App\Support\NotifiesAdmins;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    /** @var list<string> */
    public const KYC_STEPS = [
        'ntn_certificate',
        'secp_registration',
        'phytosanitary',
        'iso_haccp',
        'bank_account_letter',
    ];

    private const STEP_LABELS = [
        'ntn_certificate' => 'NTN Certificate',
        'secp_registration' => 'SECP Registration',
        'phytosanitary' => 'Phytosanitary Certificate',
        'iso_haccp' => 'ISO / HACCP Certificate',
        'bank_account_letter' => 'Bank Account Letter',
    ];

    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load(['profile', 'roles', 'latestKycApplication.documents']);
        $meta = is_array($user->profile?->meta) ? $user->profile->meta : [];
        $kyc = $this->buildKycSteps($user->id);

        return response()->json([
            'data' => [
                'user' => (new UserResource($user))->resolve($request),
                'company' => [
                    'company_name' => $user->profile?->company_name,
                    'contact_name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'country' => $user->profile?->country,
                    'city' => $user->profile?->city,
                    'address' => $user->profile?->address,
                    'website' => $meta['website'] ?? null,
                    'ntn' => $meta['ntn'] ?? null,
                    'description' => $meta['description'] ?? null,
                    'avatar_url' => $user->profile?->avatar_url,
                ],
                'kyc' => $kyc,
                'verification_pct' => $this->verificationPct($kyc['steps']),
                'notification_prefs' => $meta['notification_prefs'] ?? [
                    'offerStatus' => true,
                    'messages' => true,
                    'reminders' => true,
                    'newsletter' => false,
                ],
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
            'category' => ['nullable', 'string', 'max:100'],
            'capacity' => ['nullable', 'string', 'max:255'],
            'avatar_url' => ['nullable', 'string', 'max:1000'],
            'website' => ['nullable', 'string', 'max:255'],
            'ntn' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'meta' => ['nullable', 'array'],
            'notification_prefs' => ['nullable', 'array'],
            'account_status' => ['sometimes', 'string', Rule::in(['active', 'suspended'])],
        ]);

        $userFill = collect($data)->only(['name', 'phone'])->all();
        if (array_key_exists('account_status', $data)) {
            $userFill['account_status'] = $data['account_status'];
        }
        if ($userFill !== []) {
            $user->fill($userFill)->save();
        }

        $profile = $user->profile()->firstOrCreate(['user_id' => $user->id]);
        $meta = is_array($profile->meta) ? $profile->meta : [];

        if (array_key_exists('website', $data)) {
            $meta['website'] = $data['website'];
        }
        if (array_key_exists('ntn', $data)) {
            $meta['ntn'] = $data['ntn'];
        }
        if (array_key_exists('description', $data)) {
            $meta['description'] = $data['description'];
        }
        if (! empty($data['meta']) && is_array($data['meta'])) {
            $meta = array_replace_recursive($meta, $data['meta']);
        }
        if (! empty($data['notification_prefs']) && is_array($data['notification_prefs'])) {
            $meta['notification_prefs'] = array_merge(
                $meta['notification_prefs'] ?? [],
                $data['notification_prefs']
            );
        }

        $profile->fill(collect($data)->only([
            'company_name', 'country', 'city', 'address', 'category', 'capacity', 'avatar_url',
        ])->all());
        $profile->meta = $meta;
        $profile->save();

        return response()->json([
            'message' => 'Profile updated.',
            'data' => $this->show($request)->getData(true)['data'],
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
            ->where('type', 'supplier')
            ->latest()
            ->first();

        if (! $kyc || in_array($kyc->status, ['approved', 'rejected'], true)) {
            $kyc = KycApplication::create([
                'user_id' => $user->id,
                'type' => 'supplier',
                'country' => $user->profile?->country,
                'status' => 'pending',
                'submitted_at' => now(),
                'payload' => ['source' => 'supplier_profile'],
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
            'Supplier uploaded '.($data['doc_type']).' for review.',
            ['href' => '/admin/compliance', 'user_id' => $user->id, 'kyc_id' => $kyc->id]
        );

        return response()->json([
            'message' => 'Document uploaded for review.',
            'data' => [
                'document' => $doc,
                'kyc' => $this->buildKycSteps($user->id),
                'verification_pct' => $this->verificationPct($this->buildKycSteps($user->id)['steps']),
            ],
        ], 201);
    }

    /**
     * @return array{status: string, steps: list<array{key: string, label: string, status: string, uploaded_at: string|null, document_id: int|null}>}
     */
    private function buildKycSteps(int $userId): array
    {
        if (! Schema::hasTable('kyc_applications') || ! Schema::hasTable('kyc_documents')) {
            return [
                'status' => 'missing',
                'steps' => collect(self::KYC_STEPS)->map(fn ($key) => [
                    'key' => $key,
                    'label' => self::STEP_LABELS[$key] ?? $key,
                    'status' => 'missing',
                    'uploaded_at' => null,
                    'document_id' => null,
                ])->all(),
            ];
        }

        $kyc = KycApplication::query()
            ->where('user_id', $userId)
            ->where('type', 'supplier')
            ->with('documents')
            ->latest()
            ->first();

        $docsByType = $kyc?->documents?->keyBy('doc_type') ?? collect();
        $appStatus = $kyc?->status ?? 'missing';

        $steps = collect(self::KYC_STEPS)->map(function (string $key) use ($docsByType, $appStatus) {
            $doc = $docsByType->get($key);
            $status = 'missing';
            if ($doc) {
                $status = match ($appStatus) {
                    'approved' => 'verified',
                    'rejected' => 'rejected',
                    default => 'pending',
                };
            }

            return [
                'key' => $key,
                'label' => self::STEP_LABELS[$key] ?? $key,
                'status' => $status,
                'uploaded_at' => $doc?->created_at?->toDateString(),
                'document_id' => $doc?->id,
            ];
        })->all();

        return [
            'status' => $appStatus,
            'application_id' => $kyc?->id,
            'steps' => $steps,
        ];
    }

    /**
     * @param  list<array{status: string}>  $steps
     */
    private function verificationPct(array $steps): int
    {
        if ($steps === []) {
            return 0;
        }
        $done = collect($steps)->filter(fn ($s) => in_array($s['status'], ['verified', 'pending'], true))->count();

        return (int) round(($done / count($steps)) * 100);
    }
}
