<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shipment extends Model
{
    protected $fillable = [
        'order_id',
        'buyer_id',
        'product_snapshot',
        'vessel',
        'container',
        'origin',
        'destination',
        'shipping_line',
        'etd',
        'eta',
        'status',
        'current_milestone',
    ];

    protected function casts(): array
    {
        return [
            'etd' => 'date',
            'eta' => 'date',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function milestones(): HasMany
    {
        return $this->hasMany(ShipmentMilestone::class);
    }

    public function tradeDocuments(): HasMany
    {
        return $this->hasMany(TradeDocument::class);
    }
}
