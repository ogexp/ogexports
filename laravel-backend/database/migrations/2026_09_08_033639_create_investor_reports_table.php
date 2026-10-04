<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investor_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investor_id')->constrained('users')->cascadeOnDelete();
            $table->string('report_type', 32);
            $table->string('format', 16);
            $table->string('name');
            $table->string('file_path');
            $table->unsignedBigInteger('file_size')->default(0);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->string('status', 16)->default('ready');
            $table->timestamps();

            $table->index(['investor_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investor_reports');
    }
};
