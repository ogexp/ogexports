<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->string('trade_direction', 20)->nullable()->after('type');
        });

        DB::table('investment_projects')
            ->where('type', 'container')
            ->whereNull('trade_direction')
            ->update(['trade_direction' => 'export']);
    }

    public function down(): void
    {
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->dropColumn('trade_direction');
        });
    }
};
