<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rfqs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name');
            $table->string('qty');
            $table->string('destination');
            $table->string('incoterm')->nullable();
            $table->string('payment_terms')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('new'); // new|quoted|converted|expired
            $table->timestamp('submitted_at');
            $table->timestamps();

            $table->index('buyer_id');
            $table->index('product_id');
            $table->index('status');
            $table->index('submitted_at');
        });

        Schema::create('quotations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rfq_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->string('product_name');
            $table->decimal('qty_mt', 12, 3);
            $table->string('incoterm');
            $table->string('destination');
            $table->string('payment_terms')->nullable();
            $table->date('valid_until')->nullable();
            $table->string('status')->default('pending_admin'); // pending_admin|sent|accepted|rejected|draft|expired
            $table->string('source')->default('admin'); // auto-fob|admin
            $table->decimal('fob_unit_price', 12, 2)->default(0);
            $table->decimal('freight', 12, 2)->default(0);
            $table->decimal('insurance', 12, 2)->default(0);
            $table->decimal('doc_fee', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamp('issued_at')->nullable();
            $table->timestamps();

            $table->index('rfq_id');
            $table->index('buyer_id');
            $table->index('status');
            $table->index('valid_until');
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('pending'); // pending|confirmed|production|shipping|delivered|cancelled
            $table->string('payment_status')->default('pending');
            $table->string('payment_method')->nullable();
            $table->decimal('total_value', 14, 2)->default(0);
            $table->string('currency')->default('USD');
            $table->foreignId('quotation_id')->nullable()->constrained()->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamp('placed_at');
            $table->timestamps();

            $table->index('buyer_id');
            $table->index('status');
            $table->index('payment_status');
            $table->index('quotation_id');
            $table->index('placed_at');
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name');
            $table->string('qty');
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->decimal('line_total', 14, 2)->default(0);

            $table->index('order_id');
            $table->index('product_id');
        });

        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('qty')->default(1);
            $table->decimal('unit_price', 12, 2)->nullable();
            $table->timestamps();

            $table->unique(['cart_id', 'product_id']);
            $table->index('product_id');
        });

        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->string('product_snapshot')->nullable();
            $table->string('vessel')->nullable();
            $table->string('container')->nullable();
            $table->string('origin')->nullable();
            $table->string('destination')->nullable();
            $table->string('shipping_line')->nullable();
            $table->date('etd')->nullable();
            $table->date('eta')->nullable();
            $table->string('status')->default('pending'); // pending|booking|in-transit|arrived|delivered
            $table->string('current_milestone')->nullable();
            $table->timestamps();

            $table->index('order_id');
            $table->index('buyer_id');
            $table->index('status');
            $table->index('eta');
        });

        Schema::create('shipment_milestones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->timestamp('occurred_at')->nullable();
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index(['shipment_id', 'occurred_at']);
        });

        Schema::create('trade_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('shipment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->string('type');
            $table->string('title')->nullable();
            $table->string('path');
            $table->timestamps();

            $table->index('order_id');
            $table->index('shipment_id');
            $table->index('buyer_id');
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trade_documents');
        Schema::dropIfExists('shipment_milestones');
        Schema::dropIfExists('shipments');
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('carts');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('quotations');
        Schema::dropIfExists('rfqs');
    }
};
