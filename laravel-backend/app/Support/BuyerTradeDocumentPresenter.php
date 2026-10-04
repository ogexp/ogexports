<?php

namespace App\Support;

use App\Models\TradeDocument;

class BuyerTradeDocumentPresenter
{
    /**
     * @return array<string, mixed>
     */
    public static function present(TradeDocument $doc): array
    {
        $mime = null;
        $fileSize = null;
        $exists = $doc->path && MediaStorage::exists($doc->path);

        if ($exists) {
            $mime = MediaStorage::mimeType($doc->path) ?: null;
            $fileSize = MediaStorage::size($doc->path);
        }

        $name = $doc->title ?: $doc->type ?: $doc->path;
        $isImage = is_string($mime) && str_starts_with(strtolower($mime), 'image/');
        if (! $isImage && is_string($name)) {
            $isImage = (bool) preg_match('/\.(jpe?g|png|gif|webp|bmp|svg)$/i', $name);
        }

        $isBuyerUpload = $doc->order_id === null && $doc->shipment_id === null;

        return [
            'id' => $doc->id,
            'shipment_id' => $doc->shipment_id,
            'order_id' => $doc->order_id,
            'order_number' => $doc->order?->order_number,
            'type' => $doc->type,
            'title' => $doc->title,
            'path' => $doc->path,
            'mime' => $mime,
            'is_image' => $isImage,
            'file_size' => $fileSize,
            'status' => $exists ? 'available' : 'pending',
            'source' => $isBuyerUpload ? 'buyer' : 'admin',
            'url' => $doc->path ? MediaStorage::url($doc->path) : null,
            'download_url' => "/api/buyer/documents/{$doc->id}/download",
            'view_url' => "/api/buyer/documents/{$doc->id}/view",
            'created_at' => $doc->created_at,
        ];
    }
}
