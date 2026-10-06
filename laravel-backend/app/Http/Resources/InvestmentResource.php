<?php

namespace App\Http\Resources;

use App\Models\Investment;
use App\Models\InvestmentProfitDistribution;
use App\Support\InvestmentReferenceGenerator;
use App\Support\UserDisplayCurrency;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Investment */
class InvestmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'investor_id' => $this->investor_id,
            'investor_name' => $this->whenLoaded('investor', fn () => $this->investor?->name),
            'investor_email' => $this->whenLoaded('investor', fn () => $this->investor?->email),
            'investor' => $this->whenLoaded('investor', fn () => UserDisplayCurrency::userPayload($this->investor)),
            'amount' => (float) $this->amount,
            'amount_pkr' => $this->amount_pkr !== null ? (float) $this->amount_pkr : null,
            'expected_profit' => $this->whenLoaded(
                'project',
                fn () => round(
                    (float) $this->amount * ((float) ($this->project?->expected_return_pct ?: 0) / 100),
                    2,
                ),
            ),
            'expected_profit_pkr' => $this->whenLoaded(
                'project',
                fn () => $this->amount_pkr !== null
                    ? round((float) $this->amount_pkr * ((float) ($this->project?->expected_return_pct ?: 0) / 100), 2)
                    : null,
            ),
            'profit_amount' => $this->profit_amount !== null ? (float) $this->profit_amount : null,
            'profit_amount_pkr' => $this->profit_amount_pkr !== null ? (float) $this->profit_amount_pkr : null,
            'exchange_rate' => $this->exchange_rate !== null ? (float) $this->exchange_rate : null,
            'amount_currency' => $this->amount_currency
                ?: ($this->relationLoaded('investor')
                    ? UserDisplayCurrency::currencyForUser($this->investor)
                    : 'USD'),
            'status' => $this->status,
            'reference' => InvestmentReferenceGenerator::display($this->resource),
            'invested_at' => $this->invested_at?->toIso8601String(),
            'approved_at' => $this->approved_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'project' => new InvestmentProjectResource($this->whenLoaded('project')),
            'profit_distribution' => $this->when(
                $this->relationLoaded('profitDistribution') || $this->relationLoaded('payoutProgress'),
                function (): ?array {
                    $distribution = $this->relationLoaded('profitDistribution')
                        ? $this->profitDistribution
                        : null;
                    $progress = $this->relationLoaded('payoutProgress')
                        ? $this->payoutProgress
                        : null;

                    if (! $distribution && ! $progress) {
                        return null;
                    }

                    return [
                        'status' => $distribution?->isConfirmed()
                            ? InvestmentProfitDistribution::STATUS_DISTRIBUTED
                            : $progress?->status,
                        'planned_distribution_date' => $progress?->planned_distribution_date?->toDateString(),
                        'distributed_at' => $distribution?->distributed_at?->toIso8601String(),
                    ];
                },
            ),
            'investment_period_progress' => $this->whenLoaded(
                'project',
                fn () => $this->investmentPeriodProgress(),
            ),
        ];
    }

    private function investmentPeriodProgress(): ?array
    {
        $investedAt = $this->invested_at ? Carbon::parse($this->invested_at) : null;
        $periodDays = (int) ($this->project?->investment_period_days ?: 0);
        $eta = $this->project?->eta ? Carbon::parse($this->project->eta) : null;
        $totalDays = $periodDays > 0
            ? $periodDays
            : ($investedAt && $eta ? max(1, $investedAt->diffInDays($eta)) : 0);

        if (! $investedAt || $totalDays < 1) {
            return null;
        }

        $daysElapsed = min(
            $totalDays,
            max(0, (int) $investedAt->diffInDays(now())),
        );

        return [
            'days_elapsed' => $daysElapsed,
            'total_days' => $totalDays,
            'progress_percent' => round(min(100, ($daysElapsed / $totalDays) * 100), 1),
        ];
    }
}
