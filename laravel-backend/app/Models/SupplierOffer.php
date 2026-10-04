<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupplierOffer extends Model
{
    protected $fillable = [
        'supplier_id',
        'category',
        'product_name',
        'origin',
        'specifications',
        'available_qty',
        'price_fob',
        'currency',
        'exchange_rate',
        'line_value_usd',
        'line_value_pkr',
        'incoterm',
        'price_unit',
        'moq',
        'lead_time',
        'packaging',
        'payment_terms',
        'certifications',
        'valid_until',
        'hs_code',
        'remarks',
        'status',
        'rating',
        'images',
        'video',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'certifications' => 'array',
            'valid_until' => 'date',
            'rating' => 'integer',
            'images' => 'array',
            'submitted_at' => 'datetime',
            'exchange_rate' => 'decimal:8',
            'line_value_usd' => 'decimal:2',
            'line_value_pkr' => 'decimal:2',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supplier_id');
    }

    public function notes(): HasMany
    {
        return $this->hasMany(SupplierOfferNote::class);
    }
}
