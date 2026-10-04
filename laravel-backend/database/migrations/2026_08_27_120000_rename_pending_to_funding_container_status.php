<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('investment_projects')) {
            return;
        }

        DB::table('investment_projects')
            ->where('status', 'pending')
            ->update(['status' => 'funding']);
    }

    public function down(): void
    {
        if (! Schema::hasTable('investment_projects')) {
            return;
        }

        DB::table('investment_projects')
            ->where('status', 'funding')
            ->where('type', 'container')
            ->update(['status' => 'pending']);
    }
};
