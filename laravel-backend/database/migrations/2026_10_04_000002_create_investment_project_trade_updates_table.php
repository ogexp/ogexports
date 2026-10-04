<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investment_project_trade_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_project_id');
            $table->foreign('investment_project_id', 'trade_updates_project_fk')
                ->references('id')
                ->on('investment_projects')
                ->cascadeOnDelete();
            $table->string('status', 120);
            $table->text('description');
            $table->timestampTz('occurred_at');
            $table->string('attachment_path', 500)->nullable();
            $table->string('attachment_name', 255)->nullable();
            $table->string('attachment_mime', 160)->nullable();
            $table->unsignedBigInteger('attachment_size_bytes')->nullable();
            $table->timestamps();
            $table->index(['investment_project_id', 'occurred_at'], 'trade_updates_project_occurred_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investment_project_trade_updates');
    }
};