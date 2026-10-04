<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investment_profit_distributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('investment_projects')->cascadeOnDelete();
            $table->foreignId('investor_id')->constrained('users')->cascadeOnDelete();
            $table->string('project_type');
            $table->decimal('invested_amount', 14, 2);
            $table->decimal('profit_amount', 14, 2);
            $table->decimal('total_return', 14, 2);
            $table->decimal('roi_pct', 8, 4);
            $table->foreignId('wallet_transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('distributed_at');
            $table->timestamps();

            $table->unique('investment_id');
            $table->index('project_id');
            $table->index('investor_id');
            $table->index('project_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investment_profit_distributions');
    }
};
