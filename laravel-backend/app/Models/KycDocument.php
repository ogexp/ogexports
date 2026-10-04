<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KycDocument extends Model
{
    protected $fillable = [
        'kyc_application_id',
        'doc_type',
        'path',
        'original_name',
    ];

    public function kycApplication(): BelongsTo
    {
        return $this->belongsTo(KycApplication::class);
    }
}
