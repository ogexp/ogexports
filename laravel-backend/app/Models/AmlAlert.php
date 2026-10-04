<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AmlAlert extends Model
{
    protected $fillable = [
        'user_id',
        'severity',
        'type',
        'amount',
        'details',
        'status',
        'flagged_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'flagged_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
