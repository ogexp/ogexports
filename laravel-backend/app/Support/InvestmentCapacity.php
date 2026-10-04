<?php

namespace App\Support;

use App\Models\Investment;
use App\Models\InvestmentProject;

class InvestmentCapacity
{
    /** @var list<string> */
    private const APPROVED_STATUSES = ['active', 'completed'];

    /** @var list<string> */
    private const ELIGIBLE_INVESTOR_STATUSES = ['pending', 'active', 'completed'];

    /** @var list<string> */
    private const ACTIVE_PROJECT_STATUSES = [
        'pending',
        'investment_confirmed',
        'cargo_loaded',
        'in_transit',
        'custom_clearance',
        'funding',
        'active',
        'ready_to_ship',
        'shipping',
    ];

    /**
     * @return array{
     *   active_raised: float,
     *   pending_reserved: float,
     *   remaining_capacity: float,
     *   target_amount: float,
     *   is_full: bool,
     *   pending_count: int,
     *   active_investors_count: int,
     *   eligible_investors_count: int,
     *   slots_remaining: int
     * }
     */
    public static function snapshot(InvestmentProject $project): array
    {
        $target = (float) $project->target_amount;

        $activeRaised = (float) Investment::query()
            ->where('project_id', $project->id)
            ->whereIn('status', self::APPROVED_STATUSES)
            ->sum('amount');

        // Facility projects may store seeded/admin raised_amount before investor rows exist.
        $facilityTypes = ['plant', 'ricemill', 'feed', 'produce'];
        $columnRaised = (float) ($project->raised_amount ?: 0);
        if (in_array(strtolower((string) $project->type), $facilityTypes, true)) {
            $activeRaised = max($activeRaised, $columnRaised);
        }

        $pendingReserved = (float) Investment::query()
            ->where('project_id', $project->id)
            ->where('status', 'pending')
            ->sum('amount');

        $pendingCount = (int) Investment::query()
            ->where('project_id', $project->id)
            ->where('status', 'pending')
            ->count();

        $activeInvestorsCount = (int) Investment::query()
            ->where('project_id', $project->id)
            ->whereIn('status', self::APPROVED_STATUSES)
            ->selectRaw('COUNT(DISTINCT investor_id) as aggregate')
            ->value('aggregate');

        $eligibleInvestorsCount = (int) Investment::query()
            ->where('project_id', $project->id)
            ->whereIn('status', self::ELIGIBLE_INVESTOR_STATUSES)
            ->selectRaw('COUNT(DISTINCT investor_id) as aggregate')
            ->value('aggregate');

        $remaining = max(0, $target - $activeRaised - $pendingReserved);
        $minSlot = max(1, (float) ($project->min_investment ?: 1));
        $slotsRemaining = $minSlot > 0 ? (int) floor($remaining / $minSlot) : 0;

        return [
            'active_raised' => round($activeRaised, 2),
            'pending_reserved' => round($pendingReserved, 2),
            'remaining_capacity' => round($remaining, 2),
            'target_amount' => round($target, 2),
            'is_full' => $remaining <= 0,
            'pending_count' => $pendingCount,
            'active_investors_count' => $activeInvestorsCount,
            'eligible_investors_count' => $eligibleInvestorsCount,
            'slots_remaining' => $slotsRemaining,
        ];
    }

    /**
     * @return array{
     *   total_raised: float,
     *   total_investors: int,
     *   active_projects: int,
     *   container_count: int,
     *   produce_count: int,
     *   plant_count: int,
     *   ricemill_count: int,
     *   feed_count: int
     * }
     */
    public static function portfolioTotals(): array
    {
        $totalRaised = (float) Investment::query()
            ->whereIn('status', self::APPROVED_STATUSES)
            ->sum('amount');

        $totalInvestors = (int) Investment::query()
            ->whereIn('status', self::ELIGIBLE_INVESTOR_STATUSES)
            ->selectRaw('COUNT(DISTINCT investor_id) as aggregate')
            ->value('aggregate');

        $projects = InvestmentProject::query()->get(['type', 'status']);

        return [
            'total_raised' => round($totalRaised, 2),
            'total_investors' => $totalInvestors,
            'active_projects' => $projects->whereIn('status', self::ACTIVE_PROJECT_STATUSES)->count(),
            'container_count' => $projects->where('type', 'container')->count(),
            'produce_count' => $projects->where('type', 'produce')->count(),
            'plant_count' => $projects->where('type', 'plant')->count(),
            'ricemill_count' => $projects->where('type', 'ricemill')->count(),
            'feed_count' => $projects->where('type', 'feed')->count(),
        ];
    }

    public static function remainingCapacity(InvestmentProject $project): float
    {
        return self::snapshot($project)['remaining_capacity'];
    }

    public static function isFull(InvestmentProject $project): bool
    {
        return self::snapshot($project)['is_full'];
    }
}
