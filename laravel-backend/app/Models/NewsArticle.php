<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NewsArticle extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'category',
        'content',
        'excerpt',
        'image_url',
        'author',
        'type',
        'published_at',
        'published',
        'featured',
        'tags',
        'source',
        'source_url',
        'region',
        'views',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'published' => 'boolean',
            'featured' => 'boolean',
            'tags' => 'array',
            'views' => 'integer',
        ];
    }
}
