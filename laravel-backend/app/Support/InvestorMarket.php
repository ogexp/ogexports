<?php

namespace App\Support;

use App\Models\User;

class InvestorMarket
{
    public const PAKISTAN = 'pakistan';

    public const INTERNATIONAL = 'international';

    public static function fromCountry(?string $country): string
    {
        return strtolower(trim((string) $country)) === 'pakistan'
            ? self::PAKISTAN
            : self::INTERNATIONAL;
    }

    public static function fromUser(?User $user): string
    {
        $user?->loadMissing('profile');

        return self::fromCountry($user?->profile?->country);
    }

    public static function currency(?string $country): string
    {
        return self::fromCountry($country) === self::PAKISTAN ? 'PKR' : 'USD';
    }

    public static function currencyForUser(?User $user): string
    {
        $user?->loadMissing('profile');

        return self::currency($user?->profile?->country);
    }
}
