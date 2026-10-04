<?php

namespace App\Support;

/**
 * Shared in-app notification type constants for all portal roles.
 */
final class PortalNotificationTypes
{
    public const KYC_APPROVED = 'kyc_approved';

    public const KYC_REJECTED = 'kyc_rejected';

    public const DEPOSIT_APPROVED = 'deposit_approved';

    public const DEPOSIT_REJECTED = 'deposit_rejected';

    public const WITHDRAWAL_APPROVED = 'withdrawal_approved';

    public const WITHDRAWAL_REJECTED = 'withdrawal_rejected';

    public const BUYER_PAYMENT_APPROVED = 'buyer_payment_approved';

    public const BUYER_PAYMENT_REJECTED = 'buyer_payment_rejected';

    public const BUYER_PAYMENT_CANCELLED = 'buyer_payment_cancelled';

    public const ORDER_STATUS = 'order_status';

    public const QUOTATION = 'quotation';

    public const QUOTATION_REPLY = 'quotation_reply';

    public const SHIPMENT_UPDATE = 'shipment_update';

    public const TRADE_DOCUMENT = 'trade_document';

    public const SUPPORT_TICKET = 'support_ticket';

    public const INVESTMENT = 'investment';

    public const ANNOUNCEMENT = 'announcement';

    /**
     * Portal path for KYC based on user role / KYC application type.
     */
    public static function kycHrefForUser(\App\Models\User $user, ?string $kycType = null): string
    {
        if ($user->hasRole('buyer') || $kycType === 'company') {
            return '/buyer/company';
        }

        if ($user->hasRole('supplier') || $kycType === 'supplier') {
            return '/supplier/profile';
        }

        return '/invest/kyc';
    }
}
