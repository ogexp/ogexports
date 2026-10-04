<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->boolean('show_in_deposit')->default(false)->after('meta');
            $table->unsignedSmallInteger('deposit_sort_order')->default(0)->after('show_in_deposit');
            $table->string('dashboard_module', 32)->nullable()->after('deposit_sort_order');

            $table->index(['show_in_deposit', 'deposit_sort_order']);
            $table->index('dashboard_module');
        });

        Schema::table('platform_settings', function (Blueprint $table) {
            $table->boolean('invest_yellow_maize_visible')->default(false)->after('invest_ricemill_visible');
        });
    }

    public function down(): void
    {
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->dropIndex(['show_in_deposit', 'deposit_sort_order']);
            $table->dropIndex(['dashboard_module']);
            $table->dropColumn([
                'show_in_deposit',
                'deposit_sort_order',
                'dashboard_module',
            ]);
        });

        Schema::table('platform_settings', function (Blueprint $table) {
            $table->dropColumn('invest_yellow_maize_visible');
        });
    }
};
