<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\InvestmentProjectContainerTracking */
class ContainerTrackingResource extends JsonResource
{
    private const JOURNEY_STAGES = [
        'origin',
        'port',
        'vessel',
        'destination',
        'buyer',
        'settlement',
    ];

    public function toArray(\Illuminate\Http\Request $request): array
    {
        $journey = $this->container_journey ?? [];
        $containerJourney = [];

        foreach (self::JOURNEY_STAGES as $stage) {
            $reportedStage = $journey[$stage] ?? [];
            $containerJourney[$stage] = [
                'status' => $reportedStage['status'] ?? null,
                'date' => $reportedStage['date'] ?? null,
                'details' => $reportedStage['details'] ?? null,
            ];
        }

        return [
            'container_number' => $this->container_number,
            'bill_of_lading_number' => $this->bill_of_lading_number,
            'vessel_name' => $this->vessel_name,
            'port_of_loading' => $this->port_of_loading,
            'destination_port' => $this->destination_port,
            'etd' => $this->etd,
            'eta' => $this->eta,
            'latest_tracking_update' => $this->latest_tracking_update,
            'trade_status' => $this->trade_status,
            'container_journey' => $containerJourney,
            'tracking_updated_at' => $this->tracking_updated_at?->toIso8601String(),
        ];
    }
}
