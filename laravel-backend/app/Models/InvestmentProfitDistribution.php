<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvestmentProfitDistribution extends Model
{
    public const STATUS_DISTRIBUTED = 'distributed';

    protected $fillable = [
        'investment_id',
        'project_id',
        'investor_id',
        'project_type',
        'invested_amount',
        'invested_amount_pkr',
        'profit_amount',
        'profit_amount_pkr',
        'total_return',
        'roi_pct',
        'wallet_transaction_id',
        'distributed_at',
    ];

    protected function casts(): array
    {
        return [
            'invested_amount' => 'decimal:2',
            'invested_amount_pkr' => 'decimal:2',
            'profit_amount' => 'decimal:2',
            'profit_amount_pkr' => 'decimal:2',
            'total_return' => 'decimal:2',
            'roi_pct' => 'decimal:4',
            'distributed_at' => 'datetime',
        ];
    }

    public function investment(): BelongsTo
    {
        return $this->belongsTo(Investment::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(InvestmentProject::class, 'project_id');
    }

    public function investor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'investor_id');
    }

    public function walletTransaction(): BelongsTo
    {
        return $this->belongsTo(WalletTransaction::class);
    }

    public function isConfirmed(): bool
    {
        return $this->distributed_at !== null;
    }
}
