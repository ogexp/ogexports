<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformWalletTransaction extends Model
{
    protected $fillable = [
        'platform_wallet_id',
        'type',
        'amount',
        'direction',
        'reference',
        'status',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'meta' => 'array',
        ];
    }

    public function platformWallet(): BelongsTo
    {
        return $this->belongsTo(PlatformWallet::class);
    }
}
