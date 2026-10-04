<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supplier_certifications', function (Blueprint $table) {
            $table->id();
            $table->string('label');
            $table->string('market', 20); // pakistan | international
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['market', 'label']);
            $table->index(['market', 'is_active', 'sort_order']);
        });

        Schema::create('supplier_packaging_sizes', function (Blueprint $table) {
            $table->id();
            $table->string('label')->unique();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });

        Schema::create('supplier_payment_terms', function (Blueprint $table) {
            $table->id();
            $table->string('label');
            $table->string('market', 20); // pakistan | international
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['market', 'label']);
            $table->index(['market', 'is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_payment_terms');
        Schema::dropIfExists('supplier_packaging_sizes');
        Schema::dropIfExists('supplier_certifications');
    }
};
