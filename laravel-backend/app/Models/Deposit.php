<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Deposit extends Model
{
    protected $fillable = [
        'investor_id',
        'amount',
        'currency',
        'amount_usd',
        'usd_exchange_rate',
        'converted_amount',
        'exchange_rate',
        'wallet_currency',
        'method',
        'reference',
        'bank_reference',
        'status',
        'project_id',
        'proof_path',
        'bank_account_id',
        'bank_account_name',
        'reviewed_by',
        'reviewed_at',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'amount_usd' => 'decimal:2',
            'usd_exchange_rate' => 'decimal:8',
            'converted_amount' => 'decimal:2',
            'exchange_rate' => 'decimal:8',
            'reviewed_at' => 'datetime',
        ];
    }

    public function investor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'investor_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(InvestmentProject::class, 'project_id');
    }

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class, 'bank_account_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
