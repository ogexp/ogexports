<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quotation extends Model
{
    protected $fillable = [
        'rfq_id',
        'buyer_id',
        'product_name',
        'qty_mt',
        'incoterm',
        'destination',
        'payment_terms',
        'valid_until',
        'status',
        'source',
        'fob_unit_price',
        'freight',
        'insurance',
        'doc_fee',
        'notes',
        'issued_at',
    ];

    protected function casts(): array
    {
        return [
            'qty_mt' => 'decimal:3',
            'valid_until' => 'date',
            'fob_unit_price' => 'decimal:2',
            'freight' => 'decimal:2',
            'insurance' => 'decimal:2',
            'doc_fee' => 'decimal:2',
            'issued_at' => 'datetime',
        ];
    }

    public function rfq(): BelongsTo
    {
        return $this->belongsTo(Rfq::class);
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(QuotationMessage::class);
    }
}
