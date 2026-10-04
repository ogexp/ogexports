<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supplier_offers', function (Blueprint $table) {
            // Locked PKR-per-1-USD rate at save time (null for legacy / international USD-only rows).
            $table->decimal('exchange_rate', 16, 8)->nullable()->after('currency');
            $table->decimal('line_value_usd', 16, 2)->nullable()->after('exchange_rate');
            $table->decimal('line_value_pkr', 16, 2)->nullable()->after('line_value_usd');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('exchange_rate', 16, 8)->nullable()->after('currency');
            $table->decimal('total_value_usd', 16, 2)->nullable()->after('exchange_rate');
            $table->decimal('total_value_pkr', 16, 2)->nullable()->after('total_value_usd');
        });
    }

    public function down(): void
    {
        Schema::table('supplier_offers', function (Blueprint $table) {
            $table->dropColumn(['exchange_rate', 'line_value_usd', 'line_value_pkr']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['exchange_rate', 'total_value_usd', 'total_value_pkr']);
        });
    }
};
