<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserProfile extends Model
{
    protected $fillable = [
        'user_id',
        'company_name',
        'country',
        'city',
        'address',
        'avatar_url',
        'trust_score',
        'dept',
        'category',
        'capacity',
        'rating',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'rating' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
