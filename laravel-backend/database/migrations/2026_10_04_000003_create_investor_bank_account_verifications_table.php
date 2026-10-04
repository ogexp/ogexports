<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investor_bank_account_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investor_id')->constrained('users')->cascadeOnDelete();
            $table->string('bank_account_id', 64);
            $table->char('account_fingerprint', 64);
            $table->string('document_path', 512);
            $table->string('original_name', 255);
            $table->string('status', 20)->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();

            $table->index(['investor_id', 'bank_account_id', 'id'], 'bank_verifications_investor_account_idx');
            $table->index(['status', 'created_at'], 'bank_verifications_status_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investor_bank_account_verifications');
    }
};