<?php

namespace App\Support;

use App\Models\PlatformSetting;

class InvestmentModule
{
    public static function enabled(): bool
    {
        $settings = PlatformSetting::query()->first();

        if (! $settings) {
            return true;
        }

        return (bool) ($settings->investment_module_enabled ?? true);
    }

    public static function disabledMessage(): string
    {
        return 'The Investment module is currently unavailable.';
    }
}
