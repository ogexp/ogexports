<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\InvestmentProjectTradeUpdate */
class InvestmentProjectTradeUpdateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'description' => $this->description,
            'occurred_at' => $this->occurred_at?->toIso8601String(),
            'attachment_url' => $this->attachment_path
                ? "/api/investor/projects/{$this->investment_project_id}/updates/{$this->id}/attachment"
                : null,
            'attachment_name' => $this->attachment_name,
            'attachment_mime' => $this->attachment_mime,
            'attachment_size_bytes' => $this->attachment_size_bytes,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}