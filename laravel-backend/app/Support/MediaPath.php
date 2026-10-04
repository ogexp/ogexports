<?php

namespace App\Support;

class MediaPath
{
    /**
     * Normalize a stored upload path or absolute URL to a relative storage path.
     */
    public static function normalize(?string $pathOrUrl): ?string
    {
        if ($pathOrUrl === null) {
            return null;
        }

        $raw = trim($pathOrUrl);
        if ($raw === '') {
            return null;
        }

        if (str_starts_with($raw, 'data:') || str_starts_with($raw, 'blob:')) {
            return null;
        }

        if (
            str_starts_with($raw, 'upload/') ||
            str_starts_with($raw, 'uploads/') ||
            str_starts_with($raw, 'products/') ||
            str_starts_with($raw, 'product_images/') ||
            str_starts_with($raw, 'investment_images/')
        ) {
            return ltrim($raw, '/');
        }

        if (preg_match('/^https?:\/\//i', $raw)) {
            $parsed = parse_url($raw);
            $pathname = ltrim($parsed['path'] ?? '', '/');

            if (str_starts_with($pathname, 'storage/')) {
                $pathname = substr($pathname, strlen('storage/'));
            }

            if (
                str_starts_with($pathname, 'upload/') ||
                str_starts_with($pathname, 'uploads/') ||
                str_starts_with($pathname, 'products/') ||
                str_starts_with($pathname, 'product_images/') ||
                str_starts_with($pathname, 'investment_images/')
            ) {
                return $pathname;
            }

            return null;
        }

        $cleaned = ltrim($raw, '/');
        if (str_starts_with($cleaned, 'storage/')) {
            $cleaned = substr($cleaned, strlen('storage/'));
        }

        return $cleaned !== '' ? $cleaned : null;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function normalizeAttachmentFields(array $data): array
    {
        $path = self::normalize($data['attachment_path'] ?? null)
            ?? self::normalize($data['attachment_url'] ?? null);

        if ($path !== null) {
            $data['attachment_path'] = $path;
            $data['attachment_url'] = null;
        }

        return $data;
    }
}
