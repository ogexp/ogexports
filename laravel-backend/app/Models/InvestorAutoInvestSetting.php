<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvestorAutoInvestSetting extends Model
{
    protected $fillable = ['user_id', 'enabled', 'amount', 'commodity', 'container_type'];

    protected function casts(): array
    {
        return ['enabled' => 'boolean', 'amount' => 'decimal:2'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
