<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'two_factor_enabled')) {
                $table->boolean('two_factor_enabled')->default(false)->after('remember_token');
            }
            if (! Schema::hasColumn('users', 'two_factor_confirmed_at')) {
                $table->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_enabled');
            }
            if (! Schema::hasColumn('users', 'two_factor_code')) {
                $table->string('two_factor_code', 255)->nullable()->after('two_factor_confirmed_at');
            }
            if (! Schema::hasColumn('users', 'two_factor_code_expires_at')) {
                $table->timestamp('two_factor_code_expires_at')->nullable()->after('two_factor_code');
            }
            if (! Schema::hasColumn('users', 'two_factor_login_token')) {
                $table->string('two_factor_login_token', 64)->nullable()->after('two_factor_code_expires_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $cols = [
                'two_factor_enabled',
                'two_factor_confirmed_at',
                'two_factor_code',
                'two_factor_code_expires_at',
                'two_factor_login_token',
            ];
            $drop = array_values(array_filter($cols, fn ($c) => Schema::hasColumn('users', $c)));
            if ($drop !== []) {
                $table->dropColumn($drop);
            }
        });
    }
};
