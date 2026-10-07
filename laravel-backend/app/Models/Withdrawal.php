<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Withdrawal extends Model
{
    protected $fillable = [
        'investor_id',
        'amount',
        'amount_usd',
        'exchange_rate',
        'fee',
        'fee_usd',
        'total_debit',
        'total_debit_usd',
        'bank_details',
        'reference',
        'status',
        'note',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'amount_usd' => 'decimal:2',
            'exchange_rate' => 'decimal:8',
            'fee' => 'decimal:2',
            'fee_usd' => 'decimal:2',
            'total_debit' => 'decimal:2',
            'total_debit_usd' => 'decimal:2',
            'bank_details' => 'array',
            'reviewed_at' => 'datetime',
        ];
    }

    public function investor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'investor_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
