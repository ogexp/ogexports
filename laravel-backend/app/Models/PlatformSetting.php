<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $fillable = [
        'site_name',
        'tagline',
        'support_email',
        'whatsapp',
        'maintenance_mode',
        'registration_open',
        'kyc_required',
        'investment_open',
        'supplier_module_enabled',
        'investment_module_enabled',
        'admin_otp_enabled',
        'invest_produce_visible',
        'invest_plant_visible',
        'invest_feeds_visible',
        'invest_ricemill_visible',
        'invest_yellow_maize_visible',
        'invest_pkr_display_enabled',
        'invest_dual_currency_enabled',
        'supplier_pkr_display_enabled',
        'buyer_pkr_display_enabled',
        'currency',
        'min_investment',
        'payment_methods',
        'notification_prefs',
        'seo',
        'facility_content',
    ];

    protected function casts(): array
    {
        return [
            'maintenance_mode' => 'boolean',
            'registration_open' => 'boolean',
            'kyc_required' => 'boolean',
            'investment_open' => 'boolean',
            'supplier_module_enabled' => 'boolean',
            'investment_module_enabled' => 'boolean',
            'admin_otp_enabled' => 'boolean',
            'invest_produce_visible' => 'boolean',
            'invest_plant_visible' => 'boolean',
            'invest_feeds_visible' => 'boolean',
            'invest_ricemill_visible' => 'boolean',
            'invest_yellow_maize_visible' => 'boolean',
            'invest_pkr_display_enabled' => 'boolean',
            'invest_dual_currency_enabled' => 'boolean',
            'supplier_pkr_display_enabled' => 'boolean',
            'buyer_pkr_display_enabled' => 'boolean',
            'min_investment' => 'decimal:2',
            'payment_methods' => 'array',
            'notification_prefs' => 'array',
            'seo' => 'array',
            'facility_content' => 'array',
        ];
    }

    /**
     * Whether Pakistani investors may see amounts in PKR (alone or dual).
     * When false, all investors see USD only. Defaults to true when no row exists.
     */
    public static function pkrDisplayEnabled(): bool
    {
        $settings = static::query()->first();

        if (! $settings) {
            return true;
        }

        return $settings->invest_pkr_display_enabled !== false;
    }

    /**
     * Whether Pakistani investors see dual PKR + ($USD) amounts.
     * Only meaningful when pkrDisplayEnabled() is true.
     * Defaults to false (PKR only) when no platform settings row exists.
     */
    public static function dualCurrencyEnabled(): bool
    {
        $settings = static::query()->first();

        if (! $settings) {
            return false;
        }

        return $settings->invest_dual_currency_enabled === true;
    }

    /**
     * Whether Pakistani suppliers may see amounts in PKR.
     * When false, all suppliers see USD only. Defaults to true when no row exists.
     */
    public static function supplierPkrDisplayEnabled(): bool
    {
        $settings = static::query()->first();

        if (! $settings) {
            return true;
        }

        return $settings->supplier_pkr_display_enabled !== false;
    }

    /**
     * Whether Pakistani buyers may see amounts in PKR.
     * When false, all buyers see USD only. Defaults to true when no row exists.
     */
    public static function buyerPkrDisplayEnabled(): bool
    {
        $settings = static::query()->first();

        if (! $settings) {
            return true;
        }

        return $settings->buyer_pkr_display_enabled !== false;
    }
}
