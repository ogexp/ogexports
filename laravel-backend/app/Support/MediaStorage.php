<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaStorage
{
    public const UPLOAD_ROOT = 'upload';

    public const DOWNLOADS_ROOT = 'downloads';

    /** @var array<string, list<string>> */
    public const CATEGORY_LEGACY_PREFIXES = [
        'kyc' => ['upload/kyc/', 'uploads/kyc/', 'uploads/general/'],
        'deposits' => ['upload/deposits/', 'uploads/deposits/', 'uploads/deposit-proofs/', 'uploads/general/'],
        'investmentproject' => ['upload/investmentproject/', 'uploads/investmentproject/', 'investment_images/'],
        'supplier-offers' => ['upload/supplier-offers/', 'uploads/supplier-offers/'],
        'rfq' => ['upload/rfq/', 'uploads/rfq-attachments/'],
        'trade-documents' => ['upload/trade-documents/', 'uploads/trade-documents/', 'uploads/general/'],
        'messages' => ['upload/messages/', 'uploads/messages/', 'uploads/general/'],
        'avatars' => ['upload/avatars/', 'uploads/avatars/', 'uploads/general/'],
        'cms' => ['upload/cms/', 'uploads/media/'],
        'general' => ['upload/general/', 'uploads/general/'],
        'product-reports' => ['downloads/reports/', 'upload/general/'],
    ];

    /** @var list<string> */
    public const ALLOWED_CATEGORIES = [
        'kyc',
        'deposits',
        'investmentproject',
        'supplier-offers',
        'rfq',
        'trade-documents',
        'messages',
        'avatars',
        'cms',
        'general',
        'product-reports',
    ];

    /**
     * @return array{path: string, url: string, name: string, mime: string|null, size: int|false}
     */
    public static function store(UploadedFile $file, string $category, ?int $itemId = null, ?User $user = null): array
    {
        $category = self::normalizeCategory($category);
        $relativeDir = self::directoryFor($category, $itemId, $user);
        $absoluteDir = public_path($relativeDir);

        if (! File::isDirectory($absoluteDir)) {
            File::makeDirectory($absoluteDir, 0755, true);
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'bin');
        $basename = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) ?: 'file';
        $filename = sprintf('%s-%s-%s.%s', $basename, time(), Str::lower(Str::random(6)), $extension);

        $file->move($absoluteDir, $filename);
        $path = $relativeDir.'/'.$filename;

        return [
            'path' => $path,
            'url' => self::url($path),
            'name' => $file->getClientOriginalName(),
            'mime' => $file->getClientMimeType() ?: null,
            'size' => filesize(public_path($path)),
        ];
    }

    public static function normalizeCategory(string $category): string
    {
        $category = trim(strtolower($category), '/');

        return match ($category) {
            'investment', 'investment-project', 'investment_project' => 'investmentproject',
            'supplier_offers', 'supplieroffers' => 'supplier-offers',
            'trade_documents', 'tradedocuments' => 'trade-documents',
            'rfq-attachments', 'rfq_attachments' => 'rfq',
            'product_lab_reports', 'product_reports', 'product-lab-reports', 'reports' => 'product-reports',
            default => $category,
        };
    }

    /**
     * Map legacy folder param from POST /api/uploads to a category.
     */
    public static function categoryFromLegacyFolder(?string $folder): string
    {
        $folder = trim(strtolower((string) $folder), '/');

        if ($folder === '') {
            return 'general';
        }

        if (str_starts_with($folder, 'kyc')) {
            return 'kyc';
        }

        if (str_starts_with($folder, 'deposits') || str_starts_with($folder, 'deposit')) {
            return 'deposits';
        }

        if (str_starts_with($folder, 'investment')) {
            return 'investmentproject';
        }

        if (str_starts_with($folder, 'supplier-offers') || str_starts_with($folder, 'supplier_offers')) {
            return 'supplier-offers';
        }

        if (str_starts_with($folder, 'rfq')) {
            return 'rfq';
        }

        if (str_starts_with($folder, 'trade')) {
            return 'trade-documents';
        }

        if (str_starts_with($folder, 'message')) {
            return 'messages';
        }

        if (str_starts_with($folder, 'avatar')) {
            return 'avatars';
        }

        if (str_starts_with($folder, 'media') || str_starts_with($folder, 'cms')) {
            return 'cms';
        }

        if (
            str_starts_with($folder, 'product_lab_report')
            || str_starts_with($folder, 'product-lab-report')
            || str_starts_with($folder, 'product_report')
            || str_starts_with($folder, 'product-report')
            || $folder === 'reports'
            || str_starts_with($folder, 'downloads/reports')
            || str_starts_with($folder, 'downloads\\reports')
        ) {
            return 'product-reports';
        }

        return 'general';
    }

    public static function directoryFor(string $category, ?int $itemId = null, ?User $user = null): string
    {
        $category = self::normalizeCategory($category);

        if ($category === 'product-reports') {
            return self::DOWNLOADS_ROOT.'/reports';
        }

        if ($category === 'cms') {
            return self::UPLOAD_ROOT.'/cms';
        }

        $segment = match (true) {
            $itemId !== null && $itemId > 0 => (string) $itemId,
            $user !== null => (string) $user->id,
            $category === 'investmentproject' => 'temp',
            default => 'shared',
        };

        return self::UPLOAD_ROOT.'/'.$category.'/'.$segment;
    }

    public static function isLegacyPath(?string $path): bool
    {
        $path = MediaPath::normalize($path);

        if ($path === null) {
            return false;
        }

        return str_starts_with($path, 'uploads/')
            || str_starts_with($path, 'products/');
    }

    public static function isPublicUploadPath(?string $path): bool
    {
        $path = MediaPath::normalize($path);

        return $path !== null && str_starts_with($path, self::UPLOAD_ROOT.'/');
    }

    public static function isPublicDownloadPath(?string $path): bool
    {
        $path = MediaPath::normalize($path);

        return $path !== null && str_starts_with($path, self::DOWNLOADS_ROOT.'/');
    }

    public static function isDirectPublicPath(?string $path): bool
    {
        $path = MediaPath::normalize($path);

        if ($path === null) {
            return false;
        }

        return self::isPublicUploadPath($path)
            || self::isPublicDownloadPath($path)
            || str_starts_with($path, 'product_images/')
            || str_starts_with($path, 'investment_images/');
    }

    /**
     * @param  list<string>  $categories
     */
    public static function isAllowedPath(?string $path, array $categories): bool
    {
        $path = MediaPath::normalize($path);

        if ($path === null || str_contains($path, '..')) {
            return false;
        }

        foreach ($categories as $category) {
            $prefixes = self::CATEGORY_LEGACY_PREFIXES[self::normalizeCategory($category)] ?? [];

            foreach ($prefixes as $prefix) {
                if (str_starts_with($path, $prefix)) {
                    return true;
                }
            }
        }

        return false;
    }

    public static function url(?string $path): ?string
    {
        if ($path === null) {
            return null;
        }

        $raw = trim($path);
        if ($raw === '') {
            return null;
        }

        if (preg_match('/^https?:\/\//i', $raw)) {
            $normalized = MediaPath::normalize($raw);
            if ($normalized === null) {
                return $raw;
            }

            $path = $normalized;
        } else {
            $path = MediaPath::normalize($raw);
        }

        if ($path === null) {
            return null;
        }

        if (self::isDirectPublicPath($path)) {
            return url($path);
        }

        if (self::isLegacyPath($path)) {
            return Storage::disk('public')->url($path);
        }

        return url($path);
    }

    public static function exists(?string $path): bool
    {
        $absolute = self::absolutePath($path);

        return $absolute !== null && is_file($absolute);
    }

    public static function absolutePath(?string $path): ?string
    {
        $path = MediaPath::normalize($path);

        if ($path === null) {
            return null;
        }

        if (self::isDirectPublicPath($path)) {
            return public_path($path);
        }

        if (self::isLegacyPath($path)) {
            return Storage::disk('public')->path($path);
        }

        $publicCandidate = public_path($path);
        if (is_file($publicCandidate)) {
            return $publicCandidate;
        }

        $storageCandidate = Storage::disk('public')->path($path);
        if (is_file($storageCandidate)) {
            return $storageCandidate;
        }

        return null;
    }

    public static function mimeType(?string $path): ?string
    {
        $absolute = self::absolutePath($path);

        if ($absolute === null) {
            return null;
        }

        $mime = mime_content_type($absolute);

        return is_string($mime) && $mime !== '' ? $mime : null;
    }

    public static function size(?string $path): ?int
    {
        $absolute = self::absolutePath($path);

        if ($absolute === null) {
            return null;
        }

        $size = filesize($absolute);

        return $size === false ? null : (int) $size;
    }

    public static function response(?string $path, ?string $filename = null, array $headers = []): Response
    {
        $absolute = self::absolutePath($path);
        abort_unless($absolute !== null && is_file($absolute), 404, 'File not found.');

        $filename ??= basename($absolute);

        return response()->file($absolute, array_merge([
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ], $headers));
    }

    public static function download(?string $path, ?string $filename = null, array $headers = []): StreamedResponse|Response
    {
        $absolute = self::absolutePath($path);
        abort_unless($absolute !== null && is_file($absolute), 404, 'File not found.');

        $filename ??= basename($absolute);

        return response()->download($absolute, $filename, $headers);
    }

    public static function delete(?string $path): bool
    {
        $absolute = self::absolutePath($path);

        if ($absolute === null || ! is_file($absolute)) {
            return false;
        }

        return unlink($absolute);
    }

    /**
     * Move a file into upload/deposits/{depositId}/ and return the new relative path.
     */
    public static function moveDepositProof(?string $path, int $depositId, int $investorId): ?string
    {
        $path = MediaPath::normalize($path);

        if ($path === null || ! self::exists($path)) {
            return $path;
        }

        $targetDir = self::directoryFor('deposits', $depositId);
        $absoluteDir = public_path($targetDir);

        if (! File::isDirectory($absoluteDir)) {
            File::makeDirectory($absoluteDir, 0755, true);
        }

        $filename = basename($path);
        $targetPath = $targetDir.'/'.$filename;
        $sourceAbsolute = self::absolutePath($path);
        $targetAbsolute = public_path($targetPath);

        if ($sourceAbsolute === null) {
            return $path;
        }

        if (realpath($sourceAbsolute) === realpath($targetAbsolute)) {
            return $targetPath;
        }

        if (is_file($targetAbsolute)) {
            File::delete($targetAbsolute);
        }

        if (self::isPublicUploadPath($path)) {
            File::move($sourceAbsolute, $targetAbsolute);

            return $targetPath;
        }

        File::copy($sourceAbsolute, $targetAbsolute);
        self::delete($path);

        return $targetPath;
    }
}
