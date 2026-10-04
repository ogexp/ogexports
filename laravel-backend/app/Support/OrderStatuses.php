<?php

namespace App\Support;

class OrderStatuses
{
    public const ORDER_CONFIRMED = 'order_confirmed';

    public const PAYMENT = 'payment';

    public const PRODUCTION = 'production';

    public const QUALITY_INSPECTION = 'quality_inspection';

    public const LOADED_AT_PORT = 'loaded_at_port';

    public const IN_TRANSIT = 'in_transit';

    public const DELIVERED = 'delivered';

    public const CANCELLED = 'cancelled';

    /** Delivery timeline order (excludes cancelled). */
    public const TIMELINE = [
        self::ORDER_CONFIRMED,
        self::PAYMENT,
        self::PRODUCTION,
        self::QUALITY_INSPECTION,
        self::LOADED_AT_PORT,
        self::IN_TRANSIT,
        self::DELIVERED,
    ];

    public const LABELS = [
        self::ORDER_CONFIRMED => 'Order Confirmed',
        self::PAYMENT => 'Payment',
        self::PRODUCTION => 'Production / Procurement',
        self::QUALITY_INSPECTION => 'Quality Inspection',
        self::LOADED_AT_PORT => 'Loaded at Port',
        self::IN_TRANSIT => 'In Transit',
        self::DELIVERED => 'Delivered',
        self::CANCELLED => 'Cancelled',
    ];

    public static function all(): array
    {
        return [
            ...self::TIMELINE,
            self::CANCELLED,
        ];
    }

    public static function normalize(string $status): string
    {
        $s = strtolower(str_replace([' ', '-'], '_', trim($status)));

        return match ($s) {
            'pending', 'confirmed' => self::ORDER_CONFIRMED,
            'shipping', 'shipped' => self::IN_TRANSIT,
            'in_production' => self::PRODUCTION,
            'payment_confirmed', 'paid' => self::PAYMENT,
            'canceled' => self::CANCELLED,
            default => in_array($s, self::all(), true) ? $s : self::ORDER_CONFIRMED,
        };
    }

    /**
     * All raw DB values that map to a canonical status (for filtering legacy rows).
     *
     * @return list<string>
     */
    public static function dbVariantsFor(string $status): array
    {
        $canonical = self::normalize($status);

        $variants = match ($canonical) {
            self::ORDER_CONFIRMED => ['pending', 'confirmed', self::ORDER_CONFIRMED],
            self::PAYMENT => ['payment_confirmed', 'paid', self::PAYMENT],
            self::PRODUCTION => ['in_production', 'in-production', self::PRODUCTION],
            self::IN_TRANSIT => ['shipping', 'shipped', 'in-transit', self::IN_TRANSIT],
            self::CANCELLED => ['canceled', self::CANCELLED],
            default => [$canonical],
        };

        return array_values(array_unique($variants));
    }

    public static function emptyTimeline(): array
    {
        $timeline = [];
        foreach (self::TIMELINE as $code) {
            $timeline[$code] = null;
        }

        return $timeline;
    }

    public static function initialTimeline(?string $date = null): array
    {
        $timeline = self::emptyTimeline();
        $timeline[self::ORDER_CONFIRMED] = $date ?? now()->toDateString();

        return $timeline;
    }

    /**
     * Apply a status change: set date for the new step (and fill any gaps for prior steps).
     *
     * @param  array<string, string|null>  $existing
     * @return array<string, string|null>
     */
    public static function applyStatus(array $existing, string $status, ?string $date = null): array
    {
        $timeline = array_merge(self::emptyTimeline(), $existing);
        $date ??= now()->toDateString();

        if ($status === self::CANCELLED) {
            if (empty($timeline[self::ORDER_CONFIRMED])) {
                $timeline[self::ORDER_CONFIRMED] = $date;
            }

            return $timeline;
        }

        $idx = array_search($status, self::TIMELINE, true);
        if ($idx === false) {
            return $timeline;
        }

        for ($i = 0; $i <= $idx; $i++) {
            $code = self::TIMELINE[$i];
            if (empty($timeline[$code])) {
                $timeline[$code] = $date;
            }
        }
        // Always refresh the newly selected step date
        $timeline[self::TIMELINE[$idx]] = $date;

        return $timeline;
    }
}
