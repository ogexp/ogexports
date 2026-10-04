<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deposits', function (Blueprint $table) {
            $table->decimal('converted_amount', 14, 2)->nullable()->after('currency');
            $table->decimal('exchange_rate', 16, 8)->nullable()->after('converted_amount');
            $table->string('wallet_currency', 10)->nullable()->after('exchange_rate');
        });
    }

    public function down(): void
    {
        Schema::table('deposits', function (Blueprint $table) {
            $table->dropColumn(['converted_amount', 'exchange_rate', 'wallet_currency']);
        });
    }
};
