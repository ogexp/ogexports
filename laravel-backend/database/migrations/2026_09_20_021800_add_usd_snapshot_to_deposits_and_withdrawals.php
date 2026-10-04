<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deposits', function (Blueprint $table) {
            $table->decimal('amount_usd', 14, 2)->nullable()->after('currency');
            $table->decimal('usd_exchange_rate', 16, 8)->nullable()->after('amount_usd');
        });

        Schema::table('withdrawals', function (Blueprint $table) {
            $table->decimal('amount_usd', 14, 2)->nullable()->after('amount');
            $table->decimal('exchange_rate', 16, 8)->nullable()->after('amount_usd');
        });
    }

    public function down(): void
    {
        Schema::table('deposits', function (Blueprint $table) {
            $table->dropColumn(['amount_usd', 'usd_exchange_rate']);
        });

        Schema::table('withdrawals', function (Blueprint $table) {
            $table->dropColumn(['amount_usd', 'exchange_rate']);
        });
    }
};
