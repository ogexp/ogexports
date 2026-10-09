<?php

namespace App\Support;

use App\Models\PlatformSetting;
use App\Models\User;

class UserDisplayCurrency
{
    public static function isPakistanCountry(?string $country): bool
    {
        return strtolower(trim((string) $country)) === 'pakistan';
    }

    public static function currencyForUser(?User $user): string
    {
        if (! $user) {
            return 'USD';
        }

        $user->loadMissing(['profile', 'wallet']);

        if ($user->wallet?->currency) {
            return strtoupper((string) $user->wallet->currency);
        }

        $preferences = is_array($user->profile?->meta) ? ($user->profile->meta['preferences'] ?? []) : [];
        $preferredCurrency = is_array($preferences)
            ? strtoupper(trim((string) ($preferences['currency'] ?? '')))
            : '';
        if ($preferredCurrency !== '' && ExchangeRateService::isSupported($preferredCurrency)) {
            return $preferredCurrency;
        }

        return InvestorMarket::currencyForUser($user);
    }

    /**
     * Whether the investor's actual wallet is denominated in PKR.
     */
    public static function isPkrUser(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return self::currencyForUser($user) === 'PKR';
    }

    public static function pkrDisplayEnabled(): bool
    {
        return PlatformSetting::pkrDisplayEnabled();
    }

    public static function dualCurrencyEnabled(): bool
    {
        return PlatformSetting::dualCurrencyEnabled();
    }

    public static function supplierPkrDisplayEnabled(): bool
    {
        return PlatformSetting::supplierPkrDisplayEnabled();
    }

    public static function buyerPkrDisplayEnabled(): bool
    {
        return PlatformSetting::buyerPkrDisplayEnabled();
    }

    /**
     * Whether this user should see PKR amounts in the UI (alone or dual).
     * False when platform master switch is off → USD for everyone.
     * Investor-only (wallet/PKR user). For trade roles use shouldDisplayPkrForRole().
     */
    public static function shouldDisplayPkr(?User $user): bool
    {
        return self::pkrDisplayEnabled() && self::isPkrUser($user);
    }

    /**
     * Role-aware PKR display gate.
     * - investor: existing wallet/PKR rules + invest_pkr_display_enabled
     * - supplier / buyer: Pakistan country + respective platform flag (no dual)
     *
     * @param  'supplier'|'buyer'|'investor'  $role
     */
    public static function shouldDisplayPkrForRole(?User $user, string $role): bool
    {
        if (! $user) {
            return false;
        }

        $user->loadMissing(['profile', 'wallet']);
        $role = strtolower(trim($role));

        if ($role === 'investor') {
            return self::shouldDisplayPkr($user);
        }

        if (! self::isPakistanCountry($user->profile?->country)) {
            return false;
        }

        return match ($role) {
            'supplier' => self::supplierPkrDisplayEnabled(),
            'buyer' => self::buyerPkrDisplayEnabled(),
            default => false,
        };
    }

    /**
     * Format a trade amount (offer/order) as PKR-only or USD-only for supplier/buyer.
     *
     * @param  'supplier'|'buyer'  $role
     */
    public static function formatTradeAmount(
        ?User $user,
        string $role,
        float $nativeAmount,
        string $sourceCurrency = 'USD',
        ?float $usd = null,
        ?float $pkr = null,
        ?float $rate = null,
    ): string {
        $resolved = TradeAmountSnapshot::resolve($nativeAmount, $sourceCurrency, $usd, $pkr, $rate);

        if (self::shouldDisplayPkrForRole($user, $role)) {
            return 'PKR '.number_format($resolved['pkr'], 2);
        }

        return '$'.number_format($resolved['usd'], 2);
    }

    /**
     * @return array{country: string|null, currency: string, profile_currency: string, display_pkr: bool, wallet_currency: string|null}
     */
    public static function contextForUser(?User $user): array
    {
        if (! $user) {
            return [
                'country' => null,
                'currency' => 'USD',
                'profile_currency' => 'USD',
                'display_pkr' => false,
                'wallet_currency' => null,
            ];
        }

        $user->loadMissing(['profile', 'wallet']);
        $country = $user->profile?->country;
        $walletCurrency = $user->wallet?->currency ? strtoupper((string) $user->wallet->currency) : null;
        $currency = self::currencyForUser($user);
        $profileCurrency = InvestorMarket::currencyForUser($user);

        return [
            'country' => $country,
            'currency' => $currency,
            'profile_currency' => $profileCurrency,
            'display_pkr' => self::shouldDisplayPkr($user),
            'wallet_currency' => $walletCurrency,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function userPayload(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        $ctx = self::contextForUser($user);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'country' => $ctx['country'],
            'currency' => $ctx['currency'],
            'profile_currency' => $ctx['profile_currency'],
            'display_currency' => $ctx['display_pkr'] ? 'PKR' : ($ctx['currency'] === 'PKR' && ! self::pkrDisplayEnabled() ? 'USD' : $ctx['currency']),
            'display_pkr' => $ctx['display_pkr'],
            'wallet_currency' => $ctx['wallet_currency'],
            'invest_pkr_display_enabled' => self::pkrDisplayEnabled(),
            'invest_dual_currency_enabled' => self::dualCurrencyEnabled(),
            'supplier_pkr_display_enabled' => self::supplierPkrDisplayEnabled(),
            'buyer_pkr_display_enabled' => self::buyerPkrDisplayEnabled(),
        ];
    }

    /**
     * Pakistan CRM leads without a linked user account.
     *
     * @return array{country: string|null, currency: string, display_pkr: bool}
     */
    public static function contextForLeadCountry(?string $country): array
    {
        $isPakistan = self::isPakistanCountry($country);
        $displayPkr = $isPakistan && self::pkrDisplayEnabled();

        return [
            'country' => $country,
            'currency' => $displayPkr ? 'PKR' : 'USD',
            'display_pkr' => $displayPkr,
        ];
    }

    /**
     * Format a USD investment amount for display.
     * PKR display + dual on: `PKR 560,000.00 ($2,000.00)` — uses locked PKR when provided.
     * PKR display + dual off: `PKR 560,000.00`
     * PKR display off or non-PK: `$2,000.00`
     */
    public static function formatInvestmentDual(
        ?User $user,
        float $usd,
        ?float $pkr = null,
        ?float $rate = null,
    ): string {
        $usd = round($usd, 2);

        if (! self::shouldDisplayPkr($user)) {
            return '$'.number_format($usd, 2);
        }

        if ($pkr === null) {
            try {
                if ($rate !== null && $rate > 0) {
                    $pkr = round($usd * $rate, 2);
                } else {
                    $pkr = (float) ExchangeRateService::convert($usd, 'USD', 'PKR')['amount'];
                }
            } catch (\Throwable) {
                $pkr = $usd;
            }
        }

        $pkrLabel = 'PKR '.number_format((float) $pkr, 2);

        if (! self::dualCurrencyEnabled()) {
            return $pkrLabel;
        }

        return $pkrLabel.' ($'.number_format($usd, 2).')';
    }

    /**
     * Format an amount already stored in the user's wallet currency.
     * PKR display + dual on: `PKR … ($…)` via live FX. Dual off: `PKR …`.
     * PKR display off for PKR wallet: converts to `$…`. Others: `$…`.
     */
    public static function formatWalletDual(?User $user, float $amount): string
    {
        $amount = round($amount, 2);

        if (! self::shouldDisplayPkr($user)) {
            if (self::isPkrUser($user)) {
                try {
                    $usd = (float) ExchangeRateService::convert($amount, 'PKR', 'USD')['amount'];
                } catch (\Throwable) {
                    $usd = 0.0;
                }

                return '$'.number_format(round($usd, 2), 2);
            }

            return '$'.number_format($amount, 2);
        }

        $pkrLabel = 'PKR '.number_format($amount, 2);

        if (! self::dualCurrencyEnabled()) {
            return $pkrLabel;
        }

        try {
            $usd = (float) ExchangeRateService::convert($amount, 'PKR', 'USD')['amount'];
        } catch (\Throwable) {
            $usd = 0.0;
        }

        return $pkrLabel.' ($'.number_format($usd, 2).')';
    }
}
