<?php

namespace App\Http\Resources;

use App\Support\InvestmentCapacity;
use App\Support\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\InvestmentProject */
class InvestmentProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $capacity = InvestmentCapacity::snapshot($this->resource);

        return [
            'id' => $this->id,
            'title' => $this->title,
            'reference' => $this->reference,
            'type' => $this->type,
            'trade_direction' => $this->trade_direction,
            'status' => $this->status,
            'target_amount' => $this->target_amount,
            'raised_amount' => $capacity['active_raised'],
            'funding_percentage' => $capacity['target_amount'] > 0
                ? min(100, round(($capacity['active_raised'] / $capacity['target_amount']) * 100, 2))
                : 0,
            'remaining_amount' => $capacity['remaining_capacity'],
            'pending_reserved' => $capacity['pending_reserved'],
            'is_full' => $capacity['is_full'],
            'slots_remaining' => $capacity['slots_remaining'],
            'pending_count' => $capacity['pending_count'],
            'investors_count' => $capacity['eligible_investors_count'],
            'roi_label' => $this->roi_label,
            'expected_return_pct' => $this->expected_return_pct,
            'min_investment' => $this->min_investment,
            'max_investment' => $this->max_investment,
            'location' => $this->location,
            'origin' => $this->origin,
            'destination' => $this->destination,
            'destination_country' => $this->destination_country,
            'destination_flag' => $this->destination_flag,
            'port_of_loading' => $this->port_of_loading,
            'port_of_discharge' => $this->port_of_discharge,
            'vessel' => $this->vessel,
            'shipping_line' => $this->shipping_line,
            'commodity' => $this->commodity,
            'variety' => $this->variety,
            'container_type' => $this->container_type,
            'incoterm' => $this->incoterm,
            'payment_terms' => $this->payment_terms,
            'current_project_stage' => $this->current_project_stage,
            'etd' => $this->etd?->toDateString(),
            'eta' => $this->eta?->toDateString(),
            'funding_deadline' => $this->funding_deadline?->toDateString(),
            'image_url' => MediaStorage::url($this->image_url),
            'description' => $this->description,
            'risk_level' => $this->risk_level,
            'investment_period_days' => $this->investment_period_days,
            'container_value' => $this->container_value,
            'meta' => $this->meta,
            'container' => $this->when(
                $this->relationLoaded('containerTracking') && $this->containerTracking !== null,
                fn () => (new ContainerTrackingResource($this->containerTracking))->resolve($request)
            ),
            'documents' => $this->when(
                $this->relationLoaded('documents'),
                fn () => $this->documents->map(function ($doc) {
                    $sizeBytes = $doc->size_bytes;
                    $units = ['B', 'KB', 'MB', 'GB'];
                    $size = '—';
                    if ($sizeBytes && $sizeBytes > 0) {
                        $i = (int) floor(log($sizeBytes, 1024));
                        $i = min($i, count($units) - 1);
                        $size = round($sizeBytes / (1024 ** $i), $i === 0 ? 0 : 1).' '.$units[$i];
                    }

                    return [
                        'id' => $doc->id,
                        'title' => $doc->title,
                        'name' => $doc->title,
                        'original_name' => $doc->original_name,
                        'size_bytes' => $sizeBytes,
                        'size' => $size,
                        'mime' => $doc->mime,
                        'download_url' => url("/api/investor/projects/{$doc->investment_project_id}/documents/{$doc->id}/download"),
                    ];
                })->values()
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
