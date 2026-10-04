<?php

namespace App\Support;

use App\Models\AdminModuleView;
use App\Models\ContactMessage;
use App\Models\Deposit;
use App\Models\Investment;
use App\Models\KycApplication;
use App\Models\Order;
use App\Models\Quotation;
use App\Models\Rfq;
use App\Models\User;
use App\Models\Withdrawal;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

class AdminModuleCountService
{
    /**
     * @return array<string, int>
     */
    public function countsFor(User $admin): array
    {
        $watermarks = AdminModuleView::query()
            ->where('user_id', $admin->id)
            ->pluck('viewed_at', 'module');

        $counts = [];
        foreach (AdminModuleKeys::all() as $module) {
            $since = $this->since($watermarks->get($module));
            $counts[$module] = $this->countModule($module, $since);
        }

        return $counts;
    }

    public function markViewed(User $admin, string $module): void
    {
        AdminModuleView::query()->updateOrCreate(
            ['user_id' => $admin->id, 'module' => $module],
            ['viewed_at' => now()],
        );
    }

    private function since(mixed $viewedAt): CarbonInterface
    {
        if ($viewedAt instanceof CarbonInterface) {
            return $viewedAt;
        }

        if (is_string($viewedAt) && $viewedAt !== '') {
            return Carbon::parse($viewedAt);
        }

        return Carbon::createFromTimestamp(0);
    }

    private function countModule(string $module, CarbonInterface $since): int
    {
        return match ($module) {
            AdminModuleKeys::USERS => $this->countUsers($since),
            AdminModuleKeys::COMPLIANCE => $this->countKyc($since),
            AdminModuleKeys::CONTAINER_INVESTMENTS => $this->countInvestmentsByType('container', $since),
            AdminModuleKeys::FRESH_PRODUCE_INVESTMENTS => $this->countInvestmentsByType('produce', $since),
            AdminModuleKeys::PROCESSING_PLANT_INVESTMENTS => $this->countInvestmentsByType('plant', $since),
            AdminModuleKeys::RICE_MILL_INVESTMENTS => $this->countInvestmentsByType('ricemill', $since),
            AdminModuleKeys::FEED_MILL_INVESTMENTS => $this->countInvestmentsByType('feed', $since),
            AdminModuleKeys::INVESTMENTS_OVERVIEW => $this->countAllInvestments($since),
            AdminModuleKeys::INVESTOR_DEPOSITS => $this->countInvestorDeposits($since),
            AdminModuleKeys::BUYER_DEPOSITS => $this->countBuyerDeposits($since),
            AdminModuleKeys::PROJECT_DEPOSITS => $this->countProjectDeposits($since),
            AdminModuleKeys::PENDING_WITHDRAWALS,
            AdminModuleKeys::WITHDRAWALS => $this->countWithdrawals($since),
            AdminModuleKeys::CONTACT_INQUIRIES => $this->countContactInquiries($since),
            AdminModuleKeys::ORDERS_RFQS => $this->countRfqs($since),
            AdminModuleKeys::QUOTATIONS_PENDING => $this->countQuotationsPending($since),
            default => 0,
        };
    }

    private function countUsers(CarbonInterface $since): int
    {
        $registrations = User::query()
            ->whereDoesntHave('roles', fn ($q) => $q->where('name', 'admin'))
            ->where('created_at', '>', $since)
            ->count();

        return $registrations + $this->countKyc($since);
    }

    private function countKyc(CarbonInterface $since): int
    {
        return KycApplication::query()
            ->whereIn('status', ['pending', 'review'])
            ->where(function ($q) use ($since) {
                $q->where('submitted_at', '>', $since)
                    ->orWhere(function ($q2) use ($since) {
                        $q2->whereNull('submitted_at')
                            ->where('created_at', '>', $since);
                    });
            })
            ->count();
    }

    private function countInvestmentsByType(string $type, CarbonInterface $since): int
    {
        return Investment::query()
            ->whereHas('project', fn ($q) => $q->where('type', $type))
            ->where(function ($q) use ($since) {
                // Pending always count until reviewed; otherwise only new since last visit.
                $q->where('status', 'pending')
                    ->orWhere('created_at', '>', $since);
            })
            ->count();
    }

    private function countAllInvestments(CarbonInterface $since): int
    {
        return Investment::query()
            ->where(function ($q) use ($since) {
                $q->where('status', 'pending')
                    ->orWhere('created_at', '>', $since);
            })
            ->count();
    }

    private function countInvestorDeposits(CarbonInterface $since): int
    {
        return Deposit::query()
            ->where('status', DepositReviewStatuses::PENDING)
            ->where('created_at', '>', $since)
            ->count();
    }

    private function countBuyerDeposits(CarbonInterface $since): int
    {
        return Order::query()
            ->whereIn('payment_status', DepositReviewStatuses::buyerPendingStorage())
            ->where(function ($q) use ($since) {
                $q->where('payment_submitted_at', '>', $since)
                    ->orWhere(function ($q2) use ($since) {
                        $q2->whereNull('payment_submitted_at')
                            ->where('updated_at', '>', $since);
                    });
            })
            ->count();
    }

    private function countProjectDeposits(CarbonInterface $since): int
    {
        return Deposit::query()
            ->where('status', DepositReviewStatuses::PENDING)
            ->whereNotNull('project_id')
            ->where('created_at', '>', $since)
            ->count();
    }

    private function countWithdrawals(CarbonInterface $since): int
    {
        return Withdrawal::query()
            ->whereIn('status', ['pending', 'review'])
            ->where('created_at', '>', $since)
            ->count();
    }

    private function countContactInquiries(CarbonInterface $since): int
    {
        return ContactMessage::query()
            ->where('status', 'new')
            ->where('created_at', '>', $since)
            ->count();
    }

    private function countRfqs(CarbonInterface $since): int
    {
        return Rfq::query()
            ->where(function ($q) use ($since) {
                $q->where('submitted_at', '>', $since)
                    ->orWhere(function ($q2) use ($since) {
                        $q2->whereNull('submitted_at')
                            ->where('created_at', '>', $since);
                    });
            })
            ->count();
    }

    private function countQuotationsPending(CarbonInterface $since): int
    {
        return Quotation::query()
            ->where('created_at', '>', $since)
            ->count();
    }
}
