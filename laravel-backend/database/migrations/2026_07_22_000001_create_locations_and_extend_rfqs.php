<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('countries', function (Blueprint $table) {
            $table->id();
            $table->char('code', 2)->unique();
            $table->string('name');
            $table->timestamps();

            $table->index('name');
        });

        Schema::create('ports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('country_id')->constrained()->cascadeOnDelete();
            $table->char('unlocode', 5)->unique();
            $table->string('name');
            $table->string('subdivision', 10)->nullable();
            $table->timestamps();

            $table->index(['country_id', 'name']);
        });

        Schema::table('rfqs', function (Blueprint $table) {
            $table->foreignId('country_id')->nullable()->after('destination')->constrained()->nullOnDelete();
            $table->foreignId('port_id')->nullable()->after('country_id')->constrained()->nullOnDelete();
            $table->string('packaging')->nullable()->after('qty');
            $table->date('required_delivery_date')->nullable()->after('payment_terms');
        });
    }

    public function down(): void
    {
        Schema::table('rfqs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('port_id');
            $table->dropConstrainedForeignId('country_id');
            $table->dropColumn(['packaging', 'required_delivery_date']);
        });

        Schema::dropIfExists('ports');
        Schema::dropIfExists('countries');
    }
};
