<?php

namespace App\Support;

final class InvestorNotificationTypes
{
    public const KYC_APPROVED = 'kyc_approved';

    public const KYC_REJECTED = 'kyc_rejected';

    public const DEPOSIT = 'deposit';

    public const DEPOSIT_APPROVED = 'deposit_approved';

    public const WITHDRAWAL = 'withdrawal';

    public const WITHDRAWAL_APPROVED = 'withdrawal_approved';

    public const SHIPMENT_UPDATE = 'shipment_update';

    public const UPDATE = 'update';

    public const INVESTMENT = 'investment';

    public const ANNOUNCEMENT = 'announcement';
}
