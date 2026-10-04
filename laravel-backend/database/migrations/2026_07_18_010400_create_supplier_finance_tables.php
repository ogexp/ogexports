<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supplier_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained('users')->cascadeOnDelete();
            $table->string('category');
            $table->string('product_name');
            $table->string('origin');
            $table->text('specifications')->nullable();
            $table->string('available_qty');
            $table->string('price_fob');
            $table->string('incoterm')->nullable();
            $table->string('price_unit')->nullable();
            $table->string('moq');
            $table->string('lead_time');
            $table->string('packaging');
            $table->string('payment_terms');
            $table->json('certifications')->nullable();
            $table->date('valid_until')->nullable();
            $table->string('hs_code')->nullable();
            $table->string('status')->default('pending'); // pending|approved|rejected|hold
            $table->unsignedTinyInteger('rating')->nullable();
            $table->json('images')->nullable();
            $table->timestamp('submitted_at');
            $table->timestamps();

            $table->index('supplier_id');
            $table->index('status');
            $table->index('category');
            $table->index('submitted_at');
        });

        Schema::create('supplier_offer_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_offer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('text');
            $table->timestamps();

            $table->index('supplier_offer_id');
            $table->index('admin_id');
        });

        Schema::create('investment_projects', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('type'); // container|produce|plant|cold_storage|domestic_trading
            $table->string('status')->default('funding'); // funding|active|shipping|completed
            $table->decimal('target_amount', 14, 2);
            $table->decimal('raised_amount', 14, 2)->default(0);
            $table->unsignedInteger('investors_count')->default(0);
            $table->string('roi_label')->nullable();
            $table->decimal('expected_return_pct', 8, 2)->nullable();
            $table->decimal('min_investment', 14, 2)->nullable();
            $table->decimal('max_investment', 14, 2)->nullable();
            $table->string('location')->nullable();
            $table->string('origin')->nullable();
            $table->string('destination')->nullable();
            $table->string('destination_country')->nullable();
            $table->string('destination_flag')->nullable();
            $table->string('port_of_loading')->nullable();
            $table->string('port_of_discharge')->nullable();
            $table->string('vessel')->nullable();
            $table->string('shipping_line')->nullable();
            $table->string('commodity')->nullable();
            $table->string('variety')->nullable();
            $table->string('container_type')->nullable();
            $table->string('incoterm')->nullable();
            $table->string('payment_terms')->nullable();
            $table->string('current_project_stage')->nullable();
            $table->date('etd')->nullable();
            $table->date('eta')->nullable();
            $table->date('funding_deadline')->nullable();
            $table->string('image_url')->nullable();
            $table->longText('description')->nullable();
            $table->string('risk_level')->nullable(); // low|medium|high
            $table->integer('investment_period_days')->nullable();
            $table->decimal('container_value', 14, 2)->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('type');
            $table->index('funding_deadline');
        });

        Schema::create('investments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('investment_projects')->cascadeOnDelete();
            $table->foreignId('investor_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 14, 2);
            $table->string('status')->default('pending'); // pending|active|completed|cancelled
            $table->timestamp('invested_at');
            $table->timestamps();

            $table->index('project_id');
            $table->index('investor_id');
            $table->index('status');
        });

        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('currency')->default('USD');
            $table->decimal('available_balance', 14, 2)->default(0);
            $table->decimal('pending_balance', 14, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->decimal('amount', 14, 2);
            $table->string('direction')->default('credit'); // credit|debit
            $table->string('reference')->nullable();
            $table->string('status')->default('completed'); // completed|pending|rejected
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index('wallet_id');
            $table->index('type');
            $table->index('status');
            $table->index('reference');
        });

        Schema::create('deposits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investor_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 14, 2);
            $table->string('method');
            $table->string('reference')->nullable();
            $table->string('status')->default('pending'); // pending|approved|rejected
            $table->foreignId('project_id')->nullable()->constrained('investment_projects')->nullOnDelete();
            $table->string('proof_path')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index('investor_id');
            $table->index('status');
            $table->index('project_id');
            $table->index('reviewed_by');
        });

        Schema::create('withdrawals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investor_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 14, 2);
            $table->json('bank_details')->nullable();
            $table->string('reference')->nullable();
            $table->string('status')->default('pending'); // pending|review|approved|rejected
            $table->text('note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index('investor_id');
            $table->index('status');
            $table->index('reviewed_by');
        });

        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('bank_name');
            $table->string('account_title');
            $table->string('account_number');
            $table->string('iban')->nullable();
            $table->string('swift')->nullable();
            $table->string('currency')->default('USD');
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->text('instructions')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('is_active');
            $table->index('is_default');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_accounts');
        Schema::dropIfExists('withdrawals');
        Schema::dropIfExists('deposits');
        Schema::dropIfExists('wallet_transactions');
        Schema::dropIfExists('wallets');
        Schema::dropIfExists('investments');
        Schema::dropIfExists('investment_projects');
        Schema::dropIfExists('supplier_offer_notes');
        Schema::dropIfExists('supplier_offers');
    }
};
