<?php

namespace App\Support;

use App\Models\PlatformSetting;

class SupplierModule
{
    public static function enabled(): bool
    {
        $settings = PlatformSetting::query()->first();

        if (! $settings) {
            return true;
        }

        return (bool) ($settings->supplier_module_enabled ?? true);
    }

    public static function disabledMessage(): string
    {
        return 'The Supplier module is currently unavailable.';
    }
}
