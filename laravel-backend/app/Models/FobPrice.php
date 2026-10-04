<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FobPrice extends Model
{
    protected $fillable = [
        'product_id',
        'product_name',
        'price_per_mt',
    ];

    protected function casts(): array
    {
        return [
            'price_per_mt' => 'decimal:2',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
