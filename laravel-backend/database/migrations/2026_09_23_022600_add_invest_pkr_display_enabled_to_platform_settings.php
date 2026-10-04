<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            // Master switch: when false, all investors (incl. Pakistani) see USD only.
            // Default true preserves existing PKR-centric display for current installs.
            $table->boolean('invest_pkr_display_enabled')->default(true)->after('invest_yellow_maize_visible');
        });
    }

    public function down(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->dropColumn('invest_pkr_display_enabled');
        });
    }
};
