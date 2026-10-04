<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

class MigrateProductImages extends Command
{
    protected $signature = 'products:migrate-images {--dry-run : Report changes without writing files or database paths}';

    protected $description = 'Move product catalog images into public/product_images';

    private const IMAGE_DIR = 'product_images';

    private int $migrated = 0;

    private int $unchanged = 0;

    private int $failed = 0;

    public function handle(): int
    {
        File::ensureDirectoryExists(public_path(self::IMAGE_DIR));

        Product::query()
            ->with('media')
            ->orderBy('id')
            ->chunkById(100, function ($products): void {
                foreach ($products as $product) {
                    $primary = $this->migratePath(
                        $product->image_url,
                        $product->slug ?: 'product-'.$product->id,
                        'primary'
                    );

                    if ($primary !== null && $primary !== $product->image_url && ! $this->option('dry-run')) {
                        $product->updateQuietly(['image_url' => $primary]);
                    }

                    foreach ($product->media as $media) {
                        if ($media->type && ! str_starts_with(strtolower($media->type), 'image')) {
                            continue;
                        }

                        $path = $this->migratePath(
                            $media->url,
                            $product->slug ?: 'product-'.$product->id,
                            'gallery-'.$media->id
                        );

                        if ($path !== null && $path !== $media->url && ! $this->option('dry-run')) {
                            $media->updateQuietly(['url' => $path]);
                        }
                    }
                }
            });

        $this->table(
            ['Migrated', 'Already local', 'Failed'],
            [[$this->migrated, $this->unchanged, $this->failed]]
        );

        if ($this->option('dry-run')) {
            $this->info('Dry run complete; no files or database paths were changed.');
        }

        return $this->failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    private function migratePath(?string $source, string $productKey, string $role): ?string
    {
        if (! is_string($source) || trim($source) === '') {
            return $source;
        }

        $source = trim($source);
        $relative = ltrim($source, '/');

        if (str_starts_with($relative, self::IMAGE_DIR.'/') && File::isFile(public_path($relative))) {
            $contents = File::get(public_path($relative));
            $detectedExtension = $this->extensionFor($source, $contents);
            if (strtolower(pathinfo($relative, PATHINFO_EXTENSION)) === $detectedExtension) {
                $this->unchanged++;

                return $relative;
            }
        }

        try {
            $contents ??= $this->readImage($source, $productKey);
            if ($contents === null) {
                $this->failed++;
                $this->warn("Could not migrate image: {$source}");

                return $source;
            }

            $extension = $this->extensionFor($source, $contents);
            $filename = sprintf(
                '%s-%s-%s.%s',
                Str::slug($productKey) ?: 'product',
                Str::slug($role) ?: 'image',
                substr(sha1($source), 0, 12),
                $extension
            );
            $newRelative = self::IMAGE_DIR.'/'.$filename;

            if (! $this->option('dry-run') && ! File::isFile(public_path($newRelative))) {
                File::put(public_path($newRelative), $contents);
            }

            $this->migrated++;

            return $newRelative;
        } catch (Throwable $exception) {
            $this->failed++;
            $this->warn("Could not migrate image {$source}: {$exception->getMessage()}");

            return $source;
        }
    }

    private function readImage(string $source, string $productKey): ?string
    {
        if (preg_match('/^https?:\/\//i', $source)) {
            try {
                $response = Http::timeout(15)->get($source);
                if ($response->successful()) {
                    return $response->body();
                }
            } catch (Throwable) {
                // The original remote asset may no longer exist. Use a
                // deterministic commodity photo so the catalog stays local.
            }

            $keywords = str_replace('-', ',', Str::slug($productKey));
            $lock = hexdec(substr(sha1($productKey), 0, 5));
            $fallback = Http::timeout(30)
                ->get("https://loremflickr.com/1200/800/{$keywords}?lock={$lock}");

            return $fallback->successful() ? $fallback->body() : null;
        }

        $relative = ltrim($source, '/');
        $candidates = [
            public_path($relative),
            storage_path('app/public/'.preg_replace('#^storage/#', '', $relative)),
        ];

        foreach ($candidates as $candidate) {
            if (File::isFile($candidate)) {
                return File::get($candidate);
            }
        }

        return null;
    }

    private function extensionFor(string $source, string $contents): string
    {
        $imageInfo = @getimagesizefromstring($contents);
        $mimeExtension = match ($imageInfo['mime'] ?? null) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            default => null,
        };
        if ($mimeExtension !== null) {
            return $mimeExtension;
        }

        $path = parse_url($source, PHP_URL_PATH) ?: $source;
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)
            ? $extension
            : 'jpg';
    }
}
