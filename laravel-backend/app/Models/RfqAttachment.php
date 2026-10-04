<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Support\MediaStorage;

class RfqAttachment extends Model
{
    protected $fillable = [
        'rfq_id',
        'path',
        'original_name',
        'mime',
        'size',
    ];

    public function rfq(): BelongsTo
    {
        return $this->belongsTo(Rfq::class);
    }

    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'path' => $this->path,
            'original_name' => $this->original_name,
            'mime' => $this->mime,
            'size' => $this->size,
            'url' => MediaStorage::url($this->path),
            'is_image' => $this->isImage(),
        ];
    }

    public function isImage(): bool
    {
        $mime = strtolower((string) $this->mime);
        if (str_starts_with($mime, 'image/')) {
            return true;
        }

        $name = strtolower((string) ($this->original_name ?: $this->path));

        return (bool) preg_match('/\.(jpe?g|png|gif|webp|bmp|svg)$/i', $name);
    }
}
