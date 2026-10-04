<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentType extends Model
{
    protected $fillable = [
        'name',
        'description',
        'required_for',
        'sort_order',
        'published',
    ];

    protected function casts(): array
    {
        return [
            'required_for' => 'array',
            'sort_order' => 'integer',
            'published' => 'boolean',
        ];
    }
}
