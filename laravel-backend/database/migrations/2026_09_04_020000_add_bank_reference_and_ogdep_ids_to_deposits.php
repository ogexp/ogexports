<?php

use App\Models\Deposit;
use App\Support\DepositReferenceGenerator;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deposits', function (Blueprint $table) {
            if (! Schema::hasColumn('deposits', 'bank_reference')) {
                $table->string('bank_reference')->nullable()->after('reference');
            }
        });

        Deposit::query()
            ->with('project')
            ->orderBy('id')
            ->each(function (Deposit $deposit) {
                $current = (string) ($deposit->reference ?? '');

                if ($current !== '' && ! str_starts_with($current, 'OGDEP-')) {
                    $deposit->forceFill(['bank_reference' => $current])->saveQuietly();
                }

                $deposit->forceFill([
                    'reference' => DepositReferenceGenerator::generate($deposit),
                ])->saveQuietly();
            });
    }

    public function down(): void
    {
        Schema::table('deposits', function (Blueprint $table) {
            if (Schema::hasColumn('deposits', 'bank_reference')) {
                $table->dropColumn('bank_reference');
            }
        });
    }
};
