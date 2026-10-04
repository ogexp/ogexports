<?php

namespace App\Support;

final class AdminModuleKeys
{
    public const USERS = 'users';

    public const COMPLIANCE = 'compliance';

    public const CONTAINER_INVESTMENTS = 'container_investments';

    public const FRESH_PRODUCE_INVESTMENTS = 'fresh_produce_investments';

    public const PROCESSING_PLANT_INVESTMENTS = 'processing_plant_investments';

    public const RICE_MILL_INVESTMENTS = 'rice_mill_investments';

    public const FEED_MILL_INVESTMENTS = 'feed_mill_investments';

    public const INVESTMENTS_OVERVIEW = 'investments_overview';

    public const INVESTOR_DEPOSITS = 'investor_deposits';

    public const BUYER_DEPOSITS = 'buyer_deposits';

    public const PROJECT_DEPOSITS = 'project_deposits';

    public const PENDING_WITHDRAWALS = 'pending_withdrawals';

    public const WITHDRAWALS = 'withdrawals';

    public const CONTACT_INQUIRIES = 'contact_inquiries';

    public const ORDERS_RFQS = 'orders_rfqs';

    public const QUOTATIONS_PENDING = 'quotations_pending';

    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return [
            self::USERS,
            self::COMPLIANCE,
            self::CONTAINER_INVESTMENTS,
            self::FRESH_PRODUCE_INVESTMENTS,
            self::PROCESSING_PLANT_INVESTMENTS,
            self::RICE_MILL_INVESTMENTS,
            self::FEED_MILL_INVESTMENTS,
            self::INVESTMENTS_OVERVIEW,
            self::INVESTOR_DEPOSITS,
            self::BUYER_DEPOSITS,
            self::PROJECT_DEPOSITS,
            self::PENDING_WITHDRAWALS,
            self::WITHDRAWALS,
            self::CONTACT_INQUIRIES,
            self::ORDERS_RFQS,
            self::QUOTATIONS_PENDING,
        ];
    }

    public static function isValid(string $module): bool
    {
        return in_array($module, self::all(), true);
    }

    /**
     * Map frontend admin route (path + optional query) to a module key.
     */
    public static function fromRoute(string $path, ?string $tab = null): ?string
    {
        return match (true) {
            $path === '/admin/users' => self::USERS,
            $path === '/admin/compliance' && ($tab === null || $tab === 'kyc' || $tab === '') => self::COMPLIANCE,
            $path === '/admin/container-investments' => self::CONTAINER_INVESTMENTS,
            $path === '/admin/fresh-produce' => self::FRESH_PRODUCE_INVESTMENTS,
            $path === '/admin/processing-plant' => self::PROCESSING_PLANT_INVESTMENTS,
            $path === '/admin/rice-mill' => self::RICE_MILL_INVESTMENTS,
            $path === '/admin/feed-mill' => self::FEED_MILL_INVESTMENTS,
            $path === '/admin/investments' => self::INVESTMENTS_OVERVIEW,
            $path === '/admin/finance' && $tab === 'investor-deposits' => self::INVESTOR_DEPOSITS,
            $path === '/admin/finance' && $tab === 'buyer-deposits' => self::BUYER_DEPOSITS,
            $path === '/admin/project-deposits' => self::PROJECT_DEPOSITS,
            $path === '/admin/pending-withdrawals' => self::PENDING_WITHDRAWALS,
            $path === '/admin/finance' && $tab === 'withdrawals' => self::WITHDRAWALS,
            $path === '/admin/messages' => self::CONTACT_INQUIRIES,
            $path === '/admin/orders' => self::ORDERS_RFQS,
            $path === '/admin/quotations' => self::QUOTATIONS_PENDING,
            default => null,
        };
    }
}
