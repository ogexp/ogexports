<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_messages', function (Blueprint $table) {
            $table->timestamp('read_at')->nullable()->after('is_admin');
        });

        // Existing messages should not inflate unread badges after deploy.
        DB::table('support_messages')->whereNull('read_at')->update(['read_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('support_messages', function (Blueprint $table) {
            $table->dropColumn('read_at');
        });
    }
};
