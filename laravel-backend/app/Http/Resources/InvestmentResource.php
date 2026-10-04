<?php

namespace App\Http\Resources;

use App\Support\InvestmentReferenceGenerator;
use App\Support\UserDisplayCurrency;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Investment */
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
        ];
    }
}
