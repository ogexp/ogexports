<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_wallets', function (Blueprint $table) {
            $table->id();
            $table->string('currency', 3)->unique();
            $table->decimal('balance', 14, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('platform_wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('platform_wallet_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->decimal('amount', 14, 2);
            $table->string('direction');
            $table->string('reference')->nullable();
            $table->string('status')->default('completed');
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index('type');
            $table->index('reference');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_wallet_transactions');
        Schema::dropIfExists('platform_wallets');
    }
};
