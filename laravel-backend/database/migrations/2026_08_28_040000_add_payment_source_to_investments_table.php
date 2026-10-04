<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investments', function (Blueprint $table) {
            $table->string('payment_source', 50)->nullable()->after('reference');
        });

        // Backfill wallet-funded investments that have a matching wallet transaction.
        DB::table('investments')
            ->whereNull('payment_source')
            ->orderBy('id')
            ->get(['id', 'reference'])
            ->each(function ($investment) {
                $reference = $investment->reference ?: 'INV-'.$investment->id;

                $hasWalletTxn = DB::table('wallet_transactions')
                    ->where('reference', $reference)
                    ->where('type', 'investment')
                    ->exists();

                if ($hasWalletTxn) {
                    DB::table('investments')
                        ->where('id', $investment->id)
                        ->update(['payment_source' => 'wallet']);
                }
            });
    }

    public function down(): void
    {
        Schema::table('investments', function (Blueprint $table) {
            $table->dropColumn('payment_source');
        });
    }
};
