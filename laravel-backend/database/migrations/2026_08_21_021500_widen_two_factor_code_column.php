<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Production may be missing these columns even if the earlier
        // 2FA migration is recorded as run — add anything that is absent.
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

        // Column already exists (e.g. local) — widen so bcrypt hashes fit.
        if (Schema::hasColumn('users', 'two_factor_code')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('two_factor_code', 255)->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        // Only reverse the width change; do not drop columns that may have
        // been added by up() on environments where they were missing.
        if (Schema::hasColumn('users', 'two_factor_code')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('two_factor_code', 10)->nullable()->change();
            });
        }
    }
};
