<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvestmentProjectContainerTracking extends Model
{
    protected $fillable = [
        'container_number',
        'bill_of_lading_number',
        'vessel_name',
        'port_of_loading',
        'destination_port',
        'etd',
        'eta',
        'latest_tracking_update',
        'trade_status',
        'container_journey',
        'tracking_updated_at',
    ];

    protected function casts(): array
    {
        return [
            'container_journey' => 'array',
            'tracking_updated_at' => 'immutable_datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(InvestmentProject::class, 'investment_project_id');
    }
}
