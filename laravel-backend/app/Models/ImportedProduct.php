<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportedProduct extends Model
{
    protected $fillable = [
        'sku',
        'name',
        'category',
        'origin',
        'description',
        'price',
        'price_visible',
        'status',
        'image_url',
        'video_url',
        'specs',
    ];

    protected function casts(): array
    {
        return [
            'price_visible' => 'boolean',
            'specs' => 'array',
        ];
    }
}
