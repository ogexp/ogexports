<?php

namespace App\Support;

/**
 * Normalize buyer order payment statuses and investor deposit statuses
 * to a shared review vocabulary: pending | approved | rejected | cancelled.
 */
class DepositReviewStatuses
{
    public const PENDING = 'pending';

    public const APPROVED = 'approved';

    public const REJECTED = 'rejected';

    public const CANCELLED = 'cancelled';

    /** @var list<string> */
    public const ALL = [
        self::PENDING,
        self::APPROVED,
        self::REJECTED,
        self::CANCELLED,
    ];

    /**
     * Buyer order payment_status values that mean "awaiting admin review".
     *
     * @return list<string>
     */
    public static function buyerPendingStorage(): array
    {
        return ['pending', 'pending_verification'];
    }

    /**
     * Buyer order payment_status values that mean "approved / paid".
     *
     * @return list<string>
     */
    public static function buyerApprovedStorage(): array
    {
        return ['approved', 'paid', 'partial'];
    }

    /**
     * All buyer payment statuses shown in admin Buyer Deposits / history.
     *
     * @return list<string>
     */
    public static function buyerListedStorage(): array
    {
        return array_values(array_unique(array_merge(
            self::buyerPendingStorage(),
            self::buyerApprovedStorage(),
            [self::REJECTED, self::CANCELLED],
        )));
    }

    /**
     * Statuses that block a new "Mark as Paid" submission.
     *
     * @return list<string>
     */
    public static function buyerBlocksResubmit(): array
    {
        return array_values(array_unique(array_merge(
            self::buyerPendingStorage(),
            self::buyerApprovedStorage(),
        )));
    }

    public static function normalize(?string $status): string
    {
        $raw = strtolower(trim((string) $status));

        return match ($raw) {
            'pending_verification', 'pending' => self::PENDING,
            'paid', 'partial', 'approved' => self::APPROVED,
            'rejected' => self::REJECTED,
            'cancelled', 'canceled' => self::CANCELLED,
            default => $raw !== '' ? $raw : self::PENDING,
        };
    }

    public static function label(?string $status): string
    {
        return match (self::normalize($status)) {
            self::PENDING => 'Pending',
            self::APPROVED => 'Approved',
            self::REJECTED => 'Rejected',
            self::CANCELLED => 'Cancelled',
            default => ucfirst((string) $status),
        };
    }

    public static function isPending(?string $status): bool
    {
        return self::normalize($status) === self::PENDING;
    }

    public static function isApproved(?string $status): bool
    {
        return self::normalize($status) === self::APPROVED;
    }

    /**
     * Map a review action filter (pending|approved|...) to buyer storage values.
     *
     * @return list<string>
     */
    public static function buyerStorageForFilter(?string $normalized): array
    {
        return match (self::normalize($normalized)) {
            self::PENDING => self::buyerPendingStorage(),
            self::APPROVED => self::buyerApprovedStorage(),
            self::REJECTED => [self::REJECTED],
            self::CANCELLED => [self::CANCELLED],
            default => self::buyerListedStorage(),
        };
    }
}
