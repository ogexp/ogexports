<?php

namespace App\Http\Controllers\Api\Buyer;

use App\Http\Controllers\Controller;
use App\Models\ContactPerson;
use App\Models\Country;
use App\Models\KycApplication;
use App\Models\KycDocument;
use App\Models\Port;
use App\Models\UserProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use App\Support\MediaStorage;
use App\Support\AdminNotificationTypes;
use App\Support\NotifiesAdmins;
use Illuminate\Validation\ValidationException;

class CompanyController extends Controller
{
    /** @var list<string> */
    private const KYC_STEPS = [
        'company_registration',
        'import_license',
        'tax_registration',
        'kyc_documents',
        'banking_details',
    ];

    private const STEP_LABELS = [
        'company_registration' => 'Company Registration',
        'import_license' => 'Import License',
        'tax_registration' => 'Tax Registration',
        'kyc_documents' => 'KYC Documents',
        'banking_details' => 'Banking Details',
    ];

    private const STEP_DESCS = [
        'company_registration' => 'Registration certificate',
        'import_license' => 'Valid import license',
        'tax_registration' => 'Tax ID / VAT registration',
        'kyc_documents' => 'Identity / KYC documents',
        'banking_details' => 'Bank confirmation letter',
    ];

    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('profile');
        $profile = $user->profile;
        $meta = $this->profileMeta($profile);
        $kyc = $this->buildKycSteps($user->id);

        return response()->json([
            'data' => [
                'company' => [
                    'company_name' => $profile?->company_name,
                    'registration_no' => $meta['registration_no'] ?? null,
                    'import_license' => $meta['import_license_no'] ?? (is_string($meta['import_license'] ?? null) ? $meta['import_license'] : null),
                    'tax_id' => $meta['tax_id'] ?? null,
                    'business_type' => $meta['business_type'] ?? null,
                    'annual_volume' => $meta['annual_volume'] ?? null,
                    'website' => $meta['website'] ?? null,
                    'country' => $profile?->country,
                    'city' => $profile?->city,
                    'address' => $profile?->address,
                ],
                'trade_preferences' => $meta['trade_preferences'] ?? [
                    'payment_terms' => null,
                    'incoterm' => null,
                    'shipping' => null,
                    'ports' => [],
                    'commodities' => [],
                ],
                'contacts' => $this->loadContacts($user->id),
                'kyc' => $kyc,
                'verification_pct' => $this->verificationPct($kyc['steps']),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_name' => ['nullable', 'string', 'max:255'],
            'registration_no' => ['nullable', 'string', 'max:100'],
            'import_license' => ['nullable', 'string', 'max:100'],
            'tax_id' => ['nullable', 'string', 'max:100'],
            'business_type' => ['nullable', 'string', 'max:100'],
            'annual_volume' => ['nullable', 'string', 'max:100'],
            'website' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        $user = $request->user();
        $profile = $user->profile()->firstOrCreate(['user_id' => $user->id]);
        $meta = $this->profileMeta($profile);

        $meta['registration_no'] = $data['registration_no'] ?? ($meta['registration_no'] ?? null);
        $meta['import_license_no'] = $data['import_license'] ?? ($meta['import_license_no'] ?? null);
        if (! empty($data['import_license'])) {
            $meta['import_license'] = true;
        }
        $meta['tax_id'] = $data['tax_id'] ?? ($meta['tax_id'] ?? null);
        if (! empty($data['tax_id'])) {
            $meta['tax_registration'] = true;
        }
        $meta['business_type'] = $data['business_type'] ?? ($meta['business_type'] ?? null);
        $meta['annual_volume'] = $data['annual_volume'] ?? ($meta['annual_volume'] ?? null);
        $meta['website'] = $data['website'] ?? ($meta['website'] ?? null);

        $profile->fill([
            'company_name' => $data['company_name'] ?? $profile->company_name,
            'country' => $data['country'] ?? $profile->country,
            'city' => $data['city'] ?? $profile->city,
            'address' => $data['address'] ?? $profile->address,
            'meta' => $meta,
        ])->save();

        return $this->show($request);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $data = $request->validate([
            'payment_terms' => ['nullable', 'string', 'max:100'],
            'incoterm' => ['nullable', 'string', 'max:50'],
            'shipping' => ['nullable', 'string', 'max:100'],
            'ports' => ['nullable', 'array'],
            'ports.*' => ['string', 'max:150'],
            'commodities' => ['nullable', 'array'],
            'commodities.*' => ['string', 'max:100'],
        ]);

        $user = $request->user();
        $profile = $user->profile()->firstOrCreate(['user_id' => $user->id]);
        $ports = array_values(array_unique(array_filter($data['ports'] ?? [])));

        if ($ports !== []) {
            $this->assertPortsBelongToBuyerCountry($profile?->country, $ports);
        }

        $meta = $this->profileMeta($profile);
        $meta['trade_preferences'] = [
            'payment_terms' => $data['payment_terms'] ?? null,
            'incoterm' => $data['incoterm'] ?? null,
            'shipping' => $data['shipping'] ?? null,
            'ports' => $ports,
            'commodities' => array_values($data['commodities'] ?? []),
        ];
        $profile->update(['meta' => $meta]);

        return response()->json([
            'message' => 'Trade preferences saved.',
            'data' => $meta['trade_preferences'],
        ]);
    }

    private function resolveCountryByName(?string $countryName): ?Country
    {
        if (blank($countryName) || ! Schema::hasTable('countries')) {
            return null;
        }

        $needle = mb_strtolower(trim($countryName));
        $aliases = match ($needle) {
            'uae', 'united arab emirates' => ['united arab emirates', 'uae'],
            'ksa', 'saudi arabia' => ['saudi arabia', 'ksa'],
            'uk', 'united kingdom' => ['united kingdom', 'uk'],
            'usa', 'us', 'united states', 'united states of america' => ['united states', 'united states of america', 'usa', 'us'],
            default => [$needle],
        };

        return Country::query()
            ->where(function ($q) use ($aliases) {
                foreach ($aliases as $alias) {
                    $q->orWhereRaw('LOWER(name) = ?', [$alias]);
                }
            })
            ->first();
    }

    /**
     * Ensure preferred port labels belong to the buyer's profile country.
     *
     * @param  list<string>  $ports
     */
    private function assertPortsBelongToBuyerCountry(?string $countryName, array $ports): void
    {
        if (! Schema::hasTable('countries') || ! Schema::hasTable('ports')) {
            return;
        }

        if (blank($countryName)) {
            throw ValidationException::withMessages([
                'ports' => ['Set your company country before selecting preferred ports.'],
            ]);
        }

        $country = $this->resolveCountryByName($countryName);

        if (! $country) {
            throw ValidationException::withMessages([
                'ports' => ['Your company country is not recognized. Update the country, then select ports.'],
            ]);
        }

        $allowed = Port::query()
            ->where('country_id', $country->id)
            ->get(['name', 'unlocode'])
            ->flatMap(fn (Port $port) => [
                mb_strtolower(trim($port->name)),
                mb_strtolower(trim($port->name.' ('.$port->unlocode.')')),
                mb_strtolower(trim($port->unlocode)),
            ])
            ->unique()
            ->all();

        $invalid = array_values(array_filter(
            $ports,
            fn (string $label) => ! in_array(mb_strtolower(trim($label)), $allowed, true),
        ));

        if ($invalid !== []) {
            throw ValidationException::withMessages([
                'ports' => ['Preferred ports must belong to your country ('.$country->name.'). Invalid: '.implode(', ', $invalid)],
            ]);
        }
    }

    public function contactsIndex(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->loadContacts($request->user()->id)]);
    }

    public function contactsStore(Request $request): JsonResponse
    {
        abort_unless(Schema::hasTable('contact_persons'), 503, 'Contact persons are not available yet. Please contact support.');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'title' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'is_primary' => ['nullable', 'boolean'],
        ]);

        $userId = $request->user()->id;
        if (! empty($data['is_primary'])) {
            ContactPerson::query()->where('user_id', $userId)->update(['is_primary' => false]);
        }

        $contact = ContactPerson::create([
            'user_id' => $userId,
            'name' => $data['name'],
            'title' => $data['title'] ?? null,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'is_primary' => (bool) ($data['is_primary'] ?? false),
        ]);

        return response()->json(['message' => 'Contact created.', 'data' => $contact], 201);
    }

    public function contactsUpdate(Request $request, int $id): JsonResponse
    {
        abort_unless(Schema::hasTable('contact_persons'), 503, 'Contact persons are not available yet. Please contact support.');

        $contact = ContactPerson::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'title' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'is_primary' => ['nullable', 'boolean'],
        ]);

        if (! empty($data['is_primary'])) {
            ContactPerson::query()
                ->where('user_id', $request->user()->id)
                ->where('id', '!=', $contact->id)
                ->update(['is_primary' => false]);
        }

        $contact->update($data);

        return response()->json(['message' => 'Contact updated.', 'data' => $contact->fresh()]);
    }

    public function contactsDestroy(Request $request, int $id): JsonResponse
    {
        abort_unless(Schema::hasTable('contact_persons'), 503, 'Contact persons are not available yet. Please contact support.');

        $contact = ContactPerson::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);
        $contact->delete();

        return response()->json(['message' => 'Contact deleted.']);
    }

    public function kycUpload(Request $request): JsonResponse
    {
        $data = $request->validate([
            'doc_type' => ['required', 'string', 'in:'.implode(',', self::KYC_STEPS)],
            'path' => ['required', 'string', 'max:1000'],
            'original_name' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $kyc = KycApplication::query()
            ->where('user_id', $user->id)
            ->where('type', 'company')
            ->latest()
            ->first();

        if (! $kyc || in_array($kyc->status, ['approved', 'rejected'], true)) {
            $kyc = KycApplication::create([
                'user_id' => $user->id,
                'type' => 'company',
                'country' => $user->profile?->country,
                'status' => 'pending',
                'submitted_at' => now(),
                'payload' => ['source' => 'buyer_company'],
            ]);
        } else {
            $kyc->update([
                'status' => 'pending',
                'submitted_at' => now(),
            ]);
        }

        // Replace existing doc of same type on this application
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

        $profile = $user->profile()->firstOrCreate(['user_id' => $user->id]);
        $meta = $this->profileMeta($profile);
        if ($data['doc_type'] === 'kyc_documents') {
            $meta['kyc'] = false; // under review until approved
        }
        if ($data['doc_type'] === 'banking_details') {
            $meta['banking_details'] = true;
        }
        if ($data['doc_type'] === 'import_license') {
            $meta['import_license'] = true;
        }
        if ($data['doc_type'] === 'tax_registration') {
            $meta['tax_registration'] = true;
        }
        $profile->update(['meta' => $meta]);

        NotifiesAdmins::notify(
            AdminNotificationTypes::KYC_SUBMITTED,
            'KYC document uploaded: '.$user->name,
            'Buyer uploaded '.($data['doc_type']).' for review.',
            ['href' => '/admin/compliance', 'user_id' => $user->id, 'kyc_id' => $kyc->id]
        );

        return response()->json([
            'message' => 'Document uploaded for review.',
            'data' => [
                'document' => $doc,
                'kyc' => $this->buildKycSteps($user->id),
            ],
        ], 201);
    }

    /**
     * @return array{application: ?array<string, mixed>, steps: list<array<string, mixed>>}
     */
    private function buildKycSteps(int $userId): array
    {
        if (! Schema::hasTable('kyc_applications') || ! Schema::hasTable('kyc_documents')) {
            return [
                'application' => null,
                'steps' => $this->emptyKycSteps(),
            ];
        }

        $app = KycApplication::query()
            ->where('user_id', $userId)
            ->where('type', 'company')
            ->with('documents')
            ->latest()
            ->first();

        $docsByType = collect($app?->documents ?? [])->keyBy('doc_type');
        $appStatus = $app?->status ?? null;

        $steps = [];
        foreach (self::KYC_STEPS as $type) {
            $doc = $docsByType->get($type);
            $status = 'pending';
            $desc = self::STEP_DESCS[$type].' required';

            if ($doc) {
                if ($appStatus === 'approved') {
                    $status = 'verified';
                    $desc = self::STEP_DESCS[$type].' submitted and verified';
                } elseif ($appStatus === 'rejected') {
                    $status = 'pending';
                    $desc = 'Rejected — please re-upload '.self::STEP_DESCS[$type];
                } else {
                    $status = 'review';
                    $desc = self::STEP_DESCS[$type].' under compliance review';
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
                'doc_type' => $type,
                'label' => self::STEP_LABELS[$type],
                'status' => $status,
                'desc' => $desc,
                'document' => $doc ? [
                    'id' => $doc->id,
                    'path' => $doc->path,
                    'url' => $url,
                    'original_name' => $doc->original_name,
                ] : null,
            ];
        }

        return [
            'application' => $app ? [
                'id' => $app->id,
                'status' => $app->status,
                'submitted_at' => $app->submitted_at?->toIso8601String(),
                'reviewed_at' => $app->reviewed_at?->toIso8601String(),
                'notes' => $app->notes,
            ] : null,
            'steps' => $steps,
        ];
    }

    /**
     * @param  list<array{status: string}>  $steps
     */
    private function verificationPct(array $steps): int
    {
        $total = max(count($steps), 1);
        $done = count(array_filter($steps, fn ($s) => ($s['status'] ?? '') === 'verified'));

        return (int) round(($done / $total) * 100);
    }

    /**
     * @return array<string, mixed>
     */
    private function profileMeta(?UserProfile $profile): array
    {
        if (! $profile) {
            return [];
        }

        $raw = $profile->getRawOriginal('meta');

        if ($raw === null || $raw === '') {
            return [];
        }

        if (is_array($raw)) {
            return $raw;
        }

        if (is_string($raw)) {
            $decoded = json_decode($raw, true);

            return is_array($decoded) ? $decoded : [];
        }

        try {
            $meta = $profile->meta;

            return is_array($meta) ? $meta : [];
        } catch (\Throwable) {
            return [];
        }
    }

    private function loadContacts(int $userId): Collection
    {
        if (! Schema::hasTable('contact_persons')) {
            return collect();
        }

        return ContactPerson::query()
            ->where('user_id', $userId)
            ->orderByDesc('is_primary')
            ->orderBy('name')
            ->get();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function emptyKycSteps(): array
    {
        $steps = [];

        foreach (self::KYC_STEPS as $type) {
            $steps[] = [
                'doc_type' => $type,
                'label' => self::STEP_LABELS[$type],
                'status' => 'pending',
                'desc' => self::STEP_DESCS[$type].' required',
                'document' => null,
            ];
        }

        return $steps;
    }
}
