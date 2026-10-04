<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'transaction_password')) {
                $table->string('transaction_password')->nullable()->after('password');
            }
            if (! Schema::hasColumn('users', 'transaction_password_set_at')) {
                // Anchor to password only — do not require two_factor_* columns on live.
                $table->timestamp('transaction_password_set_at')->nullable()->after('password');
            }
            if (! Schema::hasColumn('users', 'withdraw_otp_code')) {
                $table->string('withdraw_otp_code')->nullable();
            }
            if (! Schema::hasColumn('users', 'withdraw_otp_expires_at')) {
                $table->timestamp('withdraw_otp_expires_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $cols = [
                'transaction_password',
                'transaction_password_set_at',
                'withdraw_otp_code',
                'withdraw_otp_expires_at',
            ];
            $drop = array_values(array_filter($cols, fn ($c) => Schema::hasColumn('users', $c)));
            if ($drop !== []) {
                $table->dropColumn($drop);
            }
        });
    }
};
