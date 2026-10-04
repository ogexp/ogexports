<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investments', function (Blueprint $table) {
            $table->decimal('amount_pkr', 14, 2)->nullable()->after('amount');
            $table->decimal('profit_amount_pkr', 14, 2)->nullable()->after('profit_amount');
            $table->decimal('exchange_rate', 16, 8)->nullable()->after('profit_amount_pkr');
            $table->string('amount_currency', 10)->nullable()->after('exchange_rate');
        });

        Schema::table('investment_profit_distributions', function (Blueprint $table) {
            $table->decimal('invested_amount_pkr', 14, 2)->nullable()->after('invested_amount');
            $table->decimal('profit_amount_pkr', 14, 2)->nullable()->after('profit_amount');
        });
    }

    public function down(): void
    {
        Schema::table('investments', function (Blueprint $table) {
            $table->dropColumn(['amount_pkr', 'profit_amount_pkr', 'exchange_rate', 'amount_currency']);
        });

        Schema::table('investment_profit_distributions', function (Blueprint $table) {
            $table->dropColumn(['invested_amount_pkr', 'profit_amount_pkr']);
        });
    }
};
