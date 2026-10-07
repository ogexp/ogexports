<?php

namespace App\Support;

final class InvestorNotificationTypes
{
    public const KYC_APPROVED = 'kyc_approved';

    public const KYC_REJECTED = 'kyc_rejected';

    public const DEPOSIT = 'deposit';

    public const DEPOSIT_SUBMITTED = 'deposit_submitted';

    public const DEPOSIT_APPROVED = 'deposit_approved';

    public const DEPOSIT_REJECTED = 'deposit_rejected';

    public const DEPOSIT_CANCELLED = 'deposit_cancelled';

    public const WITHDRAWAL = 'withdrawal';

    public const WITHDRAWAL_SUBMITTED = 'withdrawal_submitted';

    public const WITHDRAWAL_APPROVED = 'withdrawal_approved';

    public const WITHDRAWAL_REJECTED = 'withdrawal_rejected';

    public const SHIPMENT_UPDATE = 'shipment_update';

    public const UPDATE = 'update';

    public const INVESTMENT = 'investment';

    public const INVESTMENT_APPROVED = 'investment_approved';

    public const INVESTMENT_REJECTED = 'investment_rejected';

    public const INVESTMENT_COMPLETED = 'investment_completed';

    public const PAYOUT_PROGRESS = 'payout_progress';

    public const ANNOUNCEMENT = 'announcement';
}
