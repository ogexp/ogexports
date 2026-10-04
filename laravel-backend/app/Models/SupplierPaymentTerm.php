<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupplierPaymentTerm extends Model
{
    protected $fillable = [
        'label',
        'market',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
