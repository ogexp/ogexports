<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investment_project_stage_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_project_id');
            $table->foreign('investment_project_id', 'project_stage_updates_project_fk')
                ->references('id')
                ->on('investment_projects')
                ->cascadeOnDelete();
            $table->string('stage', 64);
            $table->string('status', 32);
            $table->text('description');
            $table->timestampTz('occurred_at');
            $table->timestamps();
            $table->index(
                ['investment_project_id', 'created_at', 'id'],
                'project_stage_updates_created_idx',
            );
            $table->index(
                ['investment_project_id', 'stage', 'created_at'],
                'project_stage_updates_stage_idx',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investment_project_stage_updates');
    }
};
