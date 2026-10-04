<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->boolean('invest_plant_visible')->default(false)->after('investment_module_enabled');
            $table->boolean('invest_feeds_visible')->default(false)->after('invest_plant_visible');
            $table->boolean('invest_ricemill_visible')->default(false)->after('invest_feeds_visible');
        });
    }

    public function down(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->dropColumn([
                'invest_plant_visible',
                'invest_feeds_visible',
                'invest_ricemill_visible',
            ]);
        });
    }
};
