<?php

namespace App\Http\Resources;

use App\Support\ContainerProjectStatus;
use App\Support\InvestmentCapacity;
use App\Support\InvestmentPaymentSource;
use App\Support\InvestmentReferenceGenerator;
use App\Support\MediaStorage;
use App\Support\UserDisplayCurrency;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Investment */
class AdminProjectInvestmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $project = $this->whenLoaded('project');
        $investor = $this->whenLoaded('investor');
        $avatarPath = $investor?->profile?->avatar_url;
        $projectImage = $project?->image_url;
        $meta = is_array($project?->meta) ? $project->meta : [];
        $paymentSource = InvestmentPaymentSource::resolve($this->resource);
        $capacity = $project ? InvestmentCapacity::snapshot($project) : null;

        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'investor_id' => $this->investor_id,
            'amount' => (float) $this->amount,
            'amount_pkr' => $this->amount_pkr !== null ? (float) $this->amount_pkr : null,
            'profit_amount' => $this->profit_amount !== null ? (float) $this->profit_amount : null,
            'profit_amount_pkr' => $this->profit_amount_pkr !== null ? (float) $this->profit_amount_pkr : null,
            'exchange_rate' => $this->exchange_rate !== null ? (float) $this->exchange_rate : null,
            'status' => $this->status,
            'reference' => InvestmentReferenceGenerator::display($this->resource),
            'payment_source' => $paymentSource,
            'payment_source_label' => InvestmentPaymentSource::label($paymentSource),
            'wallet_funding_deposits' => InvestmentPaymentSource::walletFundingDeposits($this->resource),
            'invested_at' => $this->invested_at?->toIso8601String(),
            'approved_at' => $this->approved_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'project' => $project ? [
                'id' => $project->id,
                'title' => $project->title,
                'type' => $project->type,
                'status' => ContainerProjectStatus::normalize($project->status),
                'status_label' => ContainerProjectStatus::label($project->status),
                'image_url' => $projectImage ? MediaStorage::url($projectImage) : null,
                'commodity' => $project->commodity,
                'variety' => $project->variety,
                'description' => $project->description,
                'container_type' => $project->container_type,
                'vessel' => $project->vessel,
                'shipping_line' => $project->shipping_line,
                'port_of_loading' => $project->port_of_loading,
                'port_of_discharge' => $project->port_of_discharge,
                'origin' => $project->origin,
                'destination' => $project->destination,
                'incoterm' => $project->incoterm,
                'etd' => $project->etd,
                'eta' => $project->eta,
                'expected_return_pct' => $project->expected_return_pct,
                'investment_period_days' => $project->investment_period_days,
                'target_amount' => $capacity['target_amount'],
                'raised_amount' => $capacity['active_raised'],
                'pending_reserved' => $capacity['pending_reserved'],
                'remaining_amount' => $capacity['remaining_capacity'],
                'investors_count' => $capacity['eligible_investors_count'],
                'meta' => $meta,
            ] : null,
            'investor' => $investor ? array_merge(
                UserDisplayCurrency::userPayload($this->resource->investor) ?? [],
                [
                    'avatar_url' => $avatarPath ? MediaStorage::url($avatarPath) : null,
                ]
            ) : null,
            'wallet_currency' => UserDisplayCurrency::currencyForUser($this->resource->investor),
            'amount_currency' => $this->amount_currency
                ?: UserDisplayCurrency::currencyForUser($this->resource->investor),
        ];
    }
}
