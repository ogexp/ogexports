<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investment_payout_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('status');
            $table->date('planned_distribution_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investment_payout_progress');
    }
};
