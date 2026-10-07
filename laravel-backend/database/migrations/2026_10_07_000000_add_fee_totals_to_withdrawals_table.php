<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('withdrawals', function (Blueprint $table) {
            $table->decimal('fee', 14, 2)->nullable()->after('exchange_rate');
            $table->decimal('fee_usd', 14, 2)->nullable()->after('fee');
            $table->decimal('total_debit', 14, 2)->nullable()->after('fee_usd');
            $table->decimal('total_debit_usd', 14, 2)->nullable()->after('total_debit');
        });
    }

    public function down(): void
    {
        Schema::table('withdrawals', function (Blueprint $table) {
            $table->dropColumn(['fee', 'fee_usd', 'total_debit', 'total_debit_usd']);
        });
    }
};
