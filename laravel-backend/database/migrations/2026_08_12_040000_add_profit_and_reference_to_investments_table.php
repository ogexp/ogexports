<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investments', function (Blueprint $table) {
            $table->decimal('profit_amount', 14, 2)->nullable()->after('amount');
            $table->string('reference')->nullable()->after('status');
            $table->timestamp('approved_at')->nullable()->after('invested_at');
        });
    }

    public function down(): void
    {
        Schema::table('investments', function (Blueprint $table) {
            $table->dropColumn(['profit_amount', 'reference', 'approved_at']);
        });
    }
};
