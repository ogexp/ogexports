<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvestmentPayoutProgress extends Model
{
    public const STATUS_SCHEDULED = 'scheduled';

    public const STATUS_PROCESSING = 'processing';

    protected $fillable = [
        'investment_id',
        'status',
        'planned_distribution_date',
    ];

    protected function casts(): array
    {
        return [
            'planned_distribution_date' => 'date',
        ];
    }

    public function investment(): BelongsTo
    {
        return $this->belongsTo(Investment::class);
    }
}
