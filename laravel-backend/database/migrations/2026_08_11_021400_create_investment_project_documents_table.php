<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investment_project_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_project_id')
                ->constrained('investment_projects')
                ->cascadeOnDelete();
            $table->string('title');
            $table->string('path', 500);
            $table->string('original_name')->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->string('mime')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investment_project_documents');
    }
};
