<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvestorAutoInvestCommodity extends Model
{
    protected $fillable = [
        'name',
        'enabled',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
