<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

class RestoreMissingProductImages extends Command
{
    protected $signature = 'products:restore-missing-images {--dry-run : Report only, do not download}';

    protected $description = 'Download missing product_images files for products that have image_url set in the database';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $restored = 0;
        $skipped = 0;
        $failed = 0;

        Product::query()
            ->whereNotNull('image_url')
            ->where('image_url', '!=', '')
            ->orderBy('id')
            ->each(function (Product $product) use ($dryRun, &$restored, &$skipped, &$failed): void {
                $relative = ltrim((string) $product->image_url, '/');
                if (! str_starts_with($relative, 'product_images/')) {
                    $this->line("Skip {$product->slug}: not a product_images path");
                    $skipped++;

                    return;
                }

                $absolute = public_path($relative);
                if (is_file($absolute)) {
                    $skipped++;

                    return;
                }

                $keywords = str_replace('-', ',', (string) ($product->slug ?: 'agriculture'));
                $lock = abs(crc32($relative)) % 1000;
                $url = "https://loremflickr.com/1200/800/{$keywords}?lock={$lock}";

                $this->line("Restore {$product->slug} → {$relative}");

                if ($dryRun) {
                    $restored++;

                    return;
                }

                try {
                    $response = Http::timeout(60)->get($url);
                    if (! $response->successful()) {
                        $this->error("HTTP {$response->status()} for {$product->slug}");
                        $failed++;

                        return;
                    }

                    File::ensureDirectoryExists(dirname($absolute));
                    File::put($absolute, $response->body());
                    chmod($absolute, 0644);
                    $restored++;
                } catch (\Throwable $e) {
                    $this->error("Failed {$product->slug}: {$e->getMessage()}");
                    $failed++;
                }
            });

        $this->table(['Restored', 'Skipped', 'Failed'], [[$restored, $skipped, $failed]]);

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
