<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Investment extends Model
{
    protected $fillable = [
        'project_id',
        'investor_id',
        'amount',
        'amount_pkr',
        'profit_amount',
        'profit_amount_pkr',
        'exchange_rate',
        'amount_currency',
        'status',
        'reference',
        'payment_source',
        'invested_at',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'amount_pkr' => 'decimal:2',
            'profit_amount' => 'decimal:2',
            'profit_amount_pkr' => 'decimal:2',
            'exchange_rate' => 'decimal:8',
            'invested_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(InvestmentProject::class, 'project_id');
    }

    public function investor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'investor_id');
    }

    public function profitDistribution(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(InvestmentProfitDistribution::class);
    }
}
