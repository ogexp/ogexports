<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('investor_auto_invest_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->boolean('enabled')->default(false);
            $table->decimal('amount', 18, 2);
            $table->string('commodity', 120);
            $table->string('container_type', 80);
            $table->timestamps();
        });

        Schema::create('investor_auto_invest_executions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('investment_projects')->cascadeOnDelete();
            $table->foreignId('investment_id')->nullable()->constrained('investments')->nullOnDelete();
            $table->string('status', 24)->default('processing');
            $table->decimal('amount', 18, 2);
            $table->string('message', 500)->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'project_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investor_auto_invest_executions');
        Schema::dropIfExists('investor_auto_invest_settings');
    }
};
