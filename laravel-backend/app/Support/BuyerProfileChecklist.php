<?php

namespace App\Support;

use App\Models\KycApplication;
use App\Models\User;
use App\Models\UserProfile;

/**
 * Buyer dashboard "Profile Completion" checklist aligned with company KYC steps.
 */
class BuyerProfileChecklist
{
    /** @var list<string> */
    public const STEPS = [
        'company_registration',
        'import_license',
        'tax_registration',
        'kyc_documents',
        'banking_details',
    ];

    private const LABELS = [
        'company_registration' => 'Company Registration',
        'import_license' => 'Import License',
        'tax_registration' => 'Tax Registration',
        'kyc_documents' => 'KYC Documents',
        'banking_details' => 'Banking Details',
    ];

    /**
     * @return list<array{label: string, done: bool}>
     */
    public static function build(User $user): array
    {
        $user->loadMissing('profile');
        $profile = $user->profile;
        $meta = is_array($profile?->meta) ? $profile->meta : [];

        $kyc = KycApplication::query()
            ->where('user_id', $user->id)
            ->where('type', 'company')
            ->with('documents')
            ->latest()
            ->first();

        $docsByType = collect($kyc?->documents ?? [])->keyBy('doc_type');
        $approved = KycGate::isBuyerApproved($user);

        $checklist = [];
        foreach (self::STEPS as $type) {
            $hasDoc = $docsByType->has($type);
            $checklist[] = [
                'label' => self::LABELS[$type],
                'done' => self::isStepDone($type, $hasDoc, $approved, $profile, $meta),
            ];
        }

        return $checklist;
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private static function isStepDone(
        string $type,
        bool $hasDoc,
        bool $approved,
        ?UserProfile $profile,
        array $meta
    ): bool {
        if ($approved) {
            // Approved KYC: document present, or legacy meta flags for non-registration steps.
            // Company Registration is complete once company KYC is approved (covers registration verification).
            return match ($type) {
                'company_registration' => true,
                'import_license' => $hasDoc || (bool) ($meta['import_license'] ?? $meta['importLicense'] ?? false),
                'tax_registration' => $hasDoc || (bool) ($meta['tax_registration'] ?? $meta['taxRegistration'] ?? filled($profile?->address)),
                'kyc_documents' => true,
                'banking_details' => $hasDoc || (bool) ($meta['banking'] ?? $meta['banking_details'] ?? $meta['bankingDetails'] ?? false),
                default => $hasDoc,
            };
        }

        // Not yet approved: document uploaded counts as progress; keep legacy meta/company_name rules
        return match ($type) {
            'company_registration' => $hasDoc || filled($profile?->company_name),
            'import_license' => $hasDoc || (bool) ($meta['import_license'] ?? $meta['importLicense'] ?? false),
            'tax_registration' => $hasDoc || (bool) ($meta['tax_registration'] ?? $meta['taxRegistration'] ?? filled($profile?->address)),
            'kyc_documents' => $hasDoc || (bool) ($meta['kyc'] ?? $meta['kyc_complete'] ?? $meta['kycComplete'] ?? false),
            'banking_details' => $hasDoc || (bool) ($meta['banking'] ?? $meta['banking_details'] ?? $meta['bankingDetails'] ?? false),
            default => $hasDoc,
        };
    }
}
