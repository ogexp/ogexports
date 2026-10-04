<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'order_number',
        'buyer_id',
        'status',
        'status_timeline',
        'payment_status',
        'payment_method',
        'payment_method_code',
        'payment_field1_label',
        'payment_field1_value',
        'payment_field2_label',
        'payment_field2_value',
        'payment_reference',
        'payment_submitted_at',
        'total_value',
        'currency',
        'exchange_rate',
        'total_value_usd',
        'total_value_pkr',
        'quotation_id',
        'notes',
        'country_id',
        'port_id',
        'destination',
        'destination_port',
        'incoterm',
        'required_delivery_date',
        'placed_at',
    ];

    protected function casts(): array
    {
        return [
            'total_value' => 'decimal:2',
            'exchange_rate' => 'decimal:8',
            'total_value_usd' => 'decimal:2',
            'total_value_pkr' => 'decimal:2',
            'placed_at' => 'datetime',
            'required_delivery_date' => 'date',
            'payment_submitted_at' => 'datetime',
            'status_timeline' => 'array',
        ];
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function port(): BelongsTo
    {
        return $this->belongsTo(Port::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class);
    }

    public function tradeDocuments(): HasMany
    {
        return $this->hasMany(TradeDocument::class);
    }
}
