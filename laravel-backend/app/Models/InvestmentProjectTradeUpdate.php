<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvestmentProjectTradeUpdate extends Model
{
    protected $fillable = [
        'investment_project_id',
        'status',
        'description',
        'occurred_at',
        'attachment_path',
        'attachment_name',
        'attachment_mime',
        'attachment_size_bytes',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'immutable_datetime',
            'attachment_size_bytes' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(InvestmentProject::class, 'investment_project_id');
    }
}