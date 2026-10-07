<?php

namespace App\Support;

final class InvestorNotificationPrefMap
{
    /** @var array<string, string> */
    private const TYPE_TO_CATEGORY = [
        InvestorNotificationTypes::SHIPMENT_UPDATE => 'trade',
        InvestorNotificationTypes::UPDATE => 'trade',
        InvestorNotificationTypes::INVESTMENT => 'investment',
        InvestorNotificationTypes::INVESTMENT_APPROVED => 'investment',
        InvestorNotificationTypes::INVESTMENT_REJECTED => 'investment',
        InvestorNotificationTypes::INVESTMENT_COMPLETED => 'investment',
        InvestorNotificationTypes::PAYOUT_PROGRESS => 'investment',
        InvestorNotificationTypes::DEPOSIT => 'wallet',
        InvestorNotificationTypes::DEPOSIT_SUBMITTED => 'wallet',
        InvestorNotificationTypes::DEPOSIT_APPROVED => 'wallet',
        InvestorNotificationTypes::DEPOSIT_REJECTED => 'wallet',
        InvestorNotificationTypes::DEPOSIT_CANCELLED => 'wallet',
        InvestorNotificationTypes::WITHDRAWAL => 'wallet',
        InvestorNotificationTypes::WITHDRAWAL_SUBMITTED => 'wallet',
        InvestorNotificationTypes::WITHDRAWAL_APPROVED => 'wallet',
        InvestorNotificationTypes::WITHDRAWAL_REJECTED => 'wallet',
        'profit' => 'wallet',
        'profit_credit' => 'wallet',
        InvestorNotificationTypes::KYC_APPROVED => 'kyc',
        InvestorNotificationTypes::KYC_REJECTED => 'kyc',
        'document_required' => 'kyc',
        'security' => 'security',
        'security_alert' => 'security',
        'new_device' => 'security',
        'new_device_login' => 'security',
        InvestorNotificationTypes::ANNOUNCEMENT => 'account',
    ];

    /** @var array<string, string> */
    private const TYPE_TO_LEGACY_PREF = [
        InvestorNotificationTypes::DEPOSIT => 'depositApproved',
        InvestorNotificationTypes::DEPOSIT_SUBMITTED => 'depositApproved',
        InvestorNotificationTypes::DEPOSIT_APPROVED => 'depositApproved',
        InvestorNotificationTypes::DEPOSIT_REJECTED => 'depositApproved',
        InvestorNotificationTypes::DEPOSIT_CANCELLED => 'depositApproved',
        InvestorNotificationTypes::WITHDRAWAL => 'withdrawalCompleted',
        InvestorNotificationTypes::WITHDRAWAL_SUBMITTED => 'withdrawalCompleted',
        InvestorNotificationTypes::WITHDRAWAL_APPROVED => 'withdrawalCompleted',
        InvestorNotificationTypes::WITHDRAWAL_REJECTED => 'withdrawalCompleted',
        InvestorNotificationTypes::KYC_APPROVED => 'kycUpdate',
        InvestorNotificationTypes::KYC_REJECTED => 'kycUpdate',
        InvestorNotificationTypes::ANNOUNCEMENT => 'adminAnnounce',
        InvestorNotificationTypes::UPDATE => 'marketUpdates',
        InvestorNotificationTypes::INVESTMENT => 'marketUpdates',
        InvestorNotificationTypes::INVESTMENT_APPROVED => 'marketUpdates',
        InvestorNotificationTypes::INVESTMENT_REJECTED => 'marketUpdates',
        InvestorNotificationTypes::INVESTMENT_COMPLETED => 'marketUpdates',
        InvestorNotificationTypes::PAYOUT_PROGRESS => 'marketUpdates',
        InvestorNotificationTypes::SHIPMENT_UPDATE => 'marketUpdates',
        'profit' => 'profitCredit',
        'profit_credit' => 'profitCredit',
        'document_required' => 'documentRequired',
    ];

    public static function prefKeyForType(string $type): ?string
    {
        return self::TYPE_TO_CATEGORY[$type] ?? 'account';
    }

    public static function legacyPrefKeyForType(string $type): ?string
    {
        return self::TYPE_TO_LEGACY_PREF[$type] ?? null;
    }

    public static function categoryForType(string $type): string
    {
        return match (self::prefKeyForType($type)) {
            'trade' => 'Trade',
            'investment' => 'Investment',
            'wallet' => 'Wallet',
            'kyc' => 'KYC',
            'security' => 'Security',
            default => 'Account',
        };
    }
}
