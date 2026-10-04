<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Incoterm extends Model
{
    protected $fillable = [
        'code',
        'label',
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
