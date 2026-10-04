<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            // When false, Pakistani suppliers see USD only. Default true → PKR for PK suppliers.
            $table->boolean('supplier_pkr_display_enabled')->default(true)->after('invest_dual_currency_enabled');
            // When false, Pakistani buyers see USD only. Default true → PKR for PK buyers.
            $table->boolean('buyer_pkr_display_enabled')->default(true)->after('supplier_pkr_display_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->dropColumn([
                'supplier_pkr_display_enabled',
                'buyer_pkr_display_enabled',
            ]);
        });
    }
};
