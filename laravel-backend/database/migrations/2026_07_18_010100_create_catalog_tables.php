<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->timestamps();

            $table->index('parent_id');
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('sku')->nullable()->unique();
            $table->string('status')->default('approved'); // draft|pending|approved|rejected
            $table->text('short_description')->nullable();
            $table->longText('description')->nullable();
            $table->string('origin')->nullable();
            $table->decimal('fob', 12, 2)->nullable();
            $table->decimal('price', 12, 2)->nullable();
            $table->string('currency')->default('USD');
            $table->string('min_order')->nullable();
            $table->string('moq')->nullable();
            $table->string('lead_time')->nullable();
            $table->string('hs_code')->nullable();
            $table->string('shelf_life')->nullable();
            $table->text('storage_instructions')->nullable();
            $table->string('incoterms')->nullable();
            $table->string('video_url')->nullable();
            $table->string('image_url')->nullable();
            $table->boolean('featured')->default(false);
            $table->string('stock')->nullable();
            $table->json('certifications')->nullable();
            $table->json('payment_terms')->nullable();
            $table->json('delivery_terms')->nullable();
            $table->json('packaging_options')->nullable();
            $table->json('export_markets')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('category_id');
            $table->index('status');
            $table->index('featured');
            $table->index('created_by');
        });

        Schema::create('product_specs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->string('value');
            $table->integer('sort_order')->default(0);

            $table->index(['product_id', 'sort_order']);
        });

        Schema::create('product_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('url');
            $table->string('type')->default('image'); // image|video
            $table->integer('sort_order')->default(0);

            $table->index(['product_id', 'sort_order']);
        });

        Schema::create('fob_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name');
            $table->decimal('price_per_mt', 12, 2);
            $table->timestamps();

            $table->index('product_id');
        });

        Schema::create('imported_products', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->nullable();
            $table->string('name');
            $table->string('category');
            $table->string('origin');
            $table->text('description')->nullable();
            $table->string('price')->nullable();
            $table->boolean('price_visible')->default(true);
            $table->string('status')->default('available'); // available|limited|coming-soon|out-of-stock
            $table->string('image_url')->nullable();
            $table->string('video_url')->nullable();
            $table->json('specs')->nullable();
            $table->timestamps();

            $table->index('sku');
            $table->index('status');
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('imported_products');
        Schema::dropIfExists('fob_prices');
        Schema::dropIfExists('product_media');
        Schema::dropIfExists('product_specs');
        Schema::dropIfExists('products');
        Schema::dropIfExists('categories');
    }
};
