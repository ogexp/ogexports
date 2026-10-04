<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('platform_settings', 'invest_produce_visible')) {
                $table->boolean('invest_produce_visible')->default(false)->after('investment_module_enabled');
            }
        });
    }

    public function down(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            if (Schema::hasColumn('platform_settings', 'invest_produce_visible')) {
                $table->dropColumn('invest_produce_visible');
            }
        });
    }
};
