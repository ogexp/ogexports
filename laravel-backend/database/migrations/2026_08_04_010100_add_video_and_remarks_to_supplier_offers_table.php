<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supplier_offers', function (Blueprint $table) {
            if (! Schema::hasColumn('supplier_offers', 'video')) {
                $table->string('video')->nullable()->after('images');
            }
            if (! Schema::hasColumn('supplier_offers', 'remarks')) {
                $table->text('remarks')->nullable()->after('video');
            }
        });
    }

    public function down(): void
    {
        Schema::table('supplier_offers', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('supplier_offers', 'video')) {
                $cols[] = 'video';
            }
            // Only drop remarks here if currency migration did not own it
            if (Schema::hasColumn('supplier_offers', 'remarks') && ! Schema::hasColumn('supplier_offers', 'currency')) {
                $cols[] = 'remarks';
            }
            if ($cols !== []) {
                $table->dropColumn($cols);
            }
        });
    }
};
