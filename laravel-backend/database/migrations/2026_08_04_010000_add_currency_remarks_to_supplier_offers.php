<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supplier_offers', function (Blueprint $table) {
            if (! Schema::hasColumn('supplier_offers', 'currency')) {
                $table->string('currency', 10)->default('USD')->after('price_fob');
            }
            if (! Schema::hasColumn('supplier_offers', 'remarks')) {
                $table->text('remarks')->nullable()->after('hs_code');
            }
        });
    }

    public function down(): void
    {
        Schema::table('supplier_offers', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('supplier_offers', 'currency')) {
                $cols[] = 'currency';
            }
            if (Schema::hasColumn('supplier_offers', 'remarks')) {
                $cols[] = 'remarks';
            }
            if ($cols !== []) {
                $table->dropColumn($cols);
            }
        });
    }
};
