<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class InvestmentProject extends Model
{
    protected $fillable = [
        'title',
        'reference',
        'type',
        'trade_direction',
        'status',
        'target_amount',
        'raised_amount',
        'investors_count',
        'roi_label',
        'expected_return_pct',
        'min_investment',
        'max_investment',
        'location',
        'origin',
        'destination',
        'destination_country',
        'destination_flag',
        'port_of_loading',
        'port_of_discharge',
        'vessel',
        'shipping_line',
        'commodity',
        'variety',
        'container_type',
        'incoterm',
        'payment_terms',
        'current_project_stage',
        'etd',
        'eta',
        'funding_deadline',
        'image_url',
        'description',
        'risk_level',
        'investment_period_days',
        'container_value',
        'meta',
        'show_in_deposit',
        'deposit_sort_order',
        'dashboard_module',
    ];

    protected function casts(): array
    {
        return [
            'target_amount' => 'decimal:2',
            'raised_amount' => 'decimal:2',
            'investors_count' => 'integer',
            'expected_return_pct' => 'decimal:2',
            'min_investment' => 'decimal:2',
            'max_investment' => 'decimal:2',
            'etd' => 'date',
            'eta' => 'date',
            'funding_deadline' => 'date',
            'investment_period_days' => 'integer',
            'container_value' => 'decimal:2',
            'meta' => 'array',
            'show_in_deposit' => 'boolean',
            'deposit_sort_order' => 'integer',
        ];
    }

    public function investments(): HasMany
    {
        return $this->hasMany(Investment::class, 'project_id');
    }

    public function deposits(): HasMany
    {
        return $this->hasMany(Deposit::class, 'project_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(InvestmentProjectDocument::class, 'investment_project_id');
    }

    public function containerTracking(): HasOne
    {
        return $this->hasOne(InvestmentProjectContainerTracking::class, 'investment_project_id');
    }
}
