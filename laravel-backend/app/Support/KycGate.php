<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;

class KycGate
{
    public static function isApproved(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        if (self::metaIndicatesApproved($user)) {
            return true;
        }

        $user->loadMissing('latestInvestorKycApplication');

        return ($user->latestInvestorKycApplication?->status ?? null) === 'approved';
    }

    public static function status(?User $user): string
    {
        if (! $user) {
            return 'missing';
        }

        if (self::metaIndicatesApproved($user)) {
            return 'approved';
        }

        $user->loadMissing('latestInvestorKycApplication');

        return $user->latestInvestorKycApplication?->status ?? 'missing';
    }

    public static function isBuyerApproved(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        if (self::metaIndicatesApproved($user)) {
            return true;
        }

        $user->loadMissing('latestCompanyKycApplication');

        return ($user->latestCompanyKycApplication?->status ?? null) === 'approved';
    }

    public static function buyerStatus(?User $user): string
    {
        if (! $user) {
            return 'missing';
        }

        if (self::metaIndicatesApproved($user)) {
            return 'approved';
        }

        $user->loadMissing('latestCompanyKycApplication');

        return $user->latestCompanyKycApplication?->status ?? 'missing';
    }

    public static function isSupplierApproved(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        if (self::metaIndicatesApproved($user)) {
            return true;
        }

        $user->loadMissing('latestSupplierKycApplication');

        return ($user->latestSupplierKycApplication?->status ?? null) === 'approved';
    }

    public static function supplierStatus(?User $user): string
    {
        if (! $user) {
            return 'missing';
        }

        if (self::metaIndicatesApproved($user)) {
            return 'approved';
        }

        $user->loadMissing('latestSupplierKycApplication');

        return $user->latestSupplierKycApplication?->status ?? 'missing';
    }

    /**
     * Abort with 403 unless the user's latest KYC application is approved.
     */
    public static function ensureApproved(User $user, string $message = 'Complete KYC verification before investing.'): void
    {
        if (self::isApproved($user)) {
            return;
        }

        throw new HttpResponseException(response()->json([
            'message' => $message,
            'data' => [
                'kyc_status' => self::status($user),
                'kyc_approved' => false,
            ],
        ], 403));
    }

    private static function metaIndicatesApproved(User $user): bool
    {
        $user->loadMissing('profile');
        $meta = is_array($user->profile?->meta) ? $user->profile->meta : [];

        return ($meta['kyc'] ?? false) === true || ($meta['kyc_complete'] ?? false) === true;
    }
}
