<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const IMG_RICE = 'https://ogexports.co/assets/Screenshot_2026-03-04_at_10.20.16_PM_1775121609953--GHDzNET.png';

    private const IMG_CORN = 'https://ogexports.co/assets/Screenshot_2026-03-04_at_10.21.23_PM_1775121609954-BKindUe0.png';

    private const IMG_SESAME = 'https://ogexports.co/assets/Screenshot_2026-03-04_at_10.23.37_PM_1775121609954-DNoD5JGC.png';

    public function up(): void
    {
        $defaults = [
            'container' => self::IMG_RICE,
            'produce' => self::IMG_SESAME,
            'plant' => self::IMG_CORN,
            'ricemill' => self::IMG_RICE,
            'feed' => self::IMG_CORN,
            'cold_storage' => self::IMG_CORN,
            'domestic_trading' => self::IMG_RICE,
        ];

        foreach ($defaults as $type => $imageUrl) {
            DB::table('investment_projects')
                ->where('type', $type)
                ->where(function ($query) {
                    $query->whereNull('image_url')->orWhere('image_url', '');
                })
                ->update(['image_url' => $imageUrl]);
        }
    }

    public function down(): void
    {
        // Non-destructive: leave backfilled URLs in place on rollback.
    }
};
