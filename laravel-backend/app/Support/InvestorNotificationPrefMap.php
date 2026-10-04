<?php

namespace App\Support;

use App\Support\InvestorNotificationTypes;

final class InvestorNotificationPrefMap
{
    /** @var array<string, string> */
    private const TYPE_TO_PREF = [
        InvestorNotificationTypes::DEPOSIT => 'depositApproved',
        InvestorNotificationTypes::DEPOSIT_APPROVED => 'depositApproved',
        InvestorNotificationTypes::WITHDRAWAL => 'withdrawalCompleted',
        InvestorNotificationTypes::WITHDRAWAL_APPROVED => 'withdrawalCompleted',
        InvestorNotificationTypes::KYC_APPROVED => 'kycUpdate',
        InvestorNotificationTypes::KYC_REJECTED => 'kycUpdate',
        InvestorNotificationTypes::ANNOUNCEMENT => 'adminAnnounce',
        InvestorNotificationTypes::UPDATE => 'marketUpdates',
        InvestorNotificationTypes::INVESTMENT => 'marketUpdates',
        InvestorNotificationTypes::SHIPMENT_UPDATE => 'marketUpdates',
        'profit' => 'profitCredit',
        'profit_credit' => 'profitCredit',
        'document_required' => 'documentRequired',
    ];

    public static function prefKeyForType(string $type): ?string
    {
        return self::TYPE_TO_PREF[$type] ?? null;
    }
}
