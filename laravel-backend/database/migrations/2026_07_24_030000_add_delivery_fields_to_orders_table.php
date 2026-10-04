<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('country_id')->nullable()->after('notes')->constrained()->nullOnDelete();
            $table->foreignId('port_id')->nullable()->after('country_id')->constrained()->nullOnDelete();
            $table->string('destination')->nullable()->after('port_id');
            $table->string('destination_port')->nullable()->after('destination');
            $table->string('incoterm')->nullable()->after('destination_port');
            $table->date('required_delivery_date')->nullable()->after('incoterm');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('port_id');
            $table->dropConstrainedForeignId('country_id');
            $table->dropColumn([
                'destination',
                'destination_port',
                'incoterm',
                'required_delivery_date',
            ]);
        });
    }
};
