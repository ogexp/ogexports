<?php

namespace App\Support;

class ContainerProjectStatus
{
    public const STATUSES = [
        'funding',
        'investment_confirmed',
        'cargo_loaded',
        'in_transit',
        'custom_clearance',
        'settled',
        'cancelled',
    ];

    public const LABELS = [
        'funding' => 'Funding',
        'investment_confirmed' => 'Investment Confirmed',
        'cargo_loaded' => 'Cargo Loaded',
        'in_transit' => 'In Transit',
        'custom_clearance' => 'Custom Clearance',
        'settled' => 'Settled',
        'cancelled' => 'Cancelled',
    ];

    private const LEGACY_MAP = [
        'pending' => 'funding',
        'ready_to_ship' => 'investment_confirmed',
        'active' => 'investment_confirmed',
        'shipping' => 'in_transit',
        'in_transit' => 'in_transit',
        'customs' => 'custom_clearance',
        'custom_clearance' => 'custom_clearance',
        'completed' => 'settled',
        'settled' => 'settled',
        'cancelled' => 'cancelled',
        'canceled' => 'cancelled',
        'funding' => 'funding',
        'investment_confirmed' => 'investment_confirmed',
        'cargo_loaded' => 'cargo_loaded',
    ];

    public static function normalize(?string $status): string
    {
        $raw = strtolower(trim((string) ($status ?: 'funding')));

        if (isset(self::LABELS[$raw])) {
            return $raw;
        }

        return self::LEGACY_MAP[$raw] ?? $raw;
    }

    public static function label(?string $status): string
    {
        $normalized = self::normalize($status);

        return self::LABELS[$normalized] ?? ucfirst(str_replace('_', ' ', $normalized));
    }

    /**
     * @return list<string>
     */
    public static function facilityVisibleStatuses(): array
    {
        return [
            'funding',
            'active',
            'completed',
            'coming_soon',
            'fully_funded',
            'under_construction',
            'operational',
            'closed',
        ];
    }

    /**
     * @return list<string>
     */
    public static function allVisibleStatuses(): array
    {
        return array_values(array_unique(array_merge(
            self::visibleStatuses(),
            self::facilityVisibleStatuses(),
        )));
    }

    /**
     * @return list<string>
     */
    public static function investableStatuses(): array
    {
        return ['funding'];
    }

    /**
     * @return list<string>
     */
    public static function visibleStatuses(): array
    {
        return [
            'funding',
            'investment_confirmed',
            'cargo_loaded',
            'in_transit',
            'custom_clearance',
            'settled',
        ];
    }

    public static function isInvestable(?string $status): bool
    {
        $raw = strtolower(trim((string) ($status ?: '')));

        return in_array($raw, self::investableStatuses(), true)
            || self::normalize($status) === 'funding';
    }
}
