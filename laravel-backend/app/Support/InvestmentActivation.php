<?php

namespace App\Support;

use App\Models\Investment;
use App\Models\InvestmentProject;

class InvestmentActivation
{
    /**
     * Increment project raised amount, investors count, and auto-advance status when fully funded.
     */
    public static function applyToProject(InvestmentProject $project, Investment $investment): InvestmentProject
    {
        $amount = (float) $investment->amount;

        $hadPriorActive = Investment::query()
            ->where('project_id', $project->id)
            ->where('investor_id', $investment->investor_id)
            ->where('id', '!=', $investment->id)
            ->whereIn('status', ['active', 'completed'])
            ->exists();

        $project->increment('raised_amount', $amount);
        if (! $hadPriorActive) {
            $project->increment('investors_count');
        }

        $project->refresh();
        $capacityAfter = InvestmentCapacity::snapshot($project);

        if ($capacityAfter['active_raised'] >= $capacityAfter['target_amount'] && in_array($project->status, ['funding'], true)) {
            $nextStatus = in_array(strtolower((string) $project->type), ['container', 'produce'], true)
                ? 'investment_confirmed'
                : 'active';
            $project->update(['status' => $nextStatus]);
        }

        return $project->fresh();
    }
}
