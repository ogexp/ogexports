<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletTransaction extends Model
{
    protected $fillable = [
        'wallet_id',
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

    protected static function booted(): void
    {
        static::creating(function (self $transaction): void {
            $meta = is_array($transaction->meta) ? $transaction->meta : [];
            if (! isset($meta['currency']) && $transaction->wallet_id) {
                $meta['currency'] = strtoupper((string) (
                    $meta['wallet_currency']
                    ?? Wallet::query()->whereKey($transaction->wallet_id)->value('currency')
                    ?? 'USD'
                ));
                $transaction->meta = $meta;
            }
        });
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }
}
