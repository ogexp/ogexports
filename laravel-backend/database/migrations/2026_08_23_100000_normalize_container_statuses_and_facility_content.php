<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $map = [
        'funding' => 'pending',
        'ready_to_ship' => 'investment_confirmed',
        'active' => 'investment_confirmed',
        'shipping' => 'in_transit',
        'in_transit' => 'in_transit',
        'customs' => 'custom_clearance',
        'completed' => 'settled',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('investment_projects')) {
            return;
        }

        foreach ($this->map as $from => $to) {
            DB::table('investment_projects')
                ->where('status', $from)
                ->update(['status' => $to]);
        }

        if (Schema::hasTable('platform_settings') && ! Schema::hasColumn('platform_settings', 'facility_content')) {
            Schema::table('platform_settings', function (Blueprint $table) {
                $table->json('facility_content')->nullable()->after('seo');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('platform_settings') && Schema::hasColumn('platform_settings', 'facility_content')) {
            Schema::table('platform_settings', function (Blueprint $table) {
                $table->dropColumn('facility_content');
            });
        }

        if (! Schema::hasTable('investment_projects')) {
            return;
        }

        $reverse = array_flip($this->map);
        foreach ($reverse as $from => $to) {
            DB::table('investment_projects')
                ->where('status', $from)
                ->update(['status' => $to]);
        }
    }
};
