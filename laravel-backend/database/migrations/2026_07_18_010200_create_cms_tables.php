<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value');
            $table->timestamps();
        });

        Schema::create('news_articles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('category');
            $table->longText('content');
            $table->text('excerpt')->nullable();
            $table->string('image_url')->nullable();
            $table->string('author')->nullable();
            $table->string('type')->default('trade');
            $table->timestamp('published_at')->nullable();
            $table->boolean('published')->default(false);
            $table->boolean('featured')->default(false);
            $table->json('tags')->nullable();
            $table->string('source')->nullable();
            $table->string('source_url')->nullable();
            $table->string('region')->nullable();
            $table->unsignedInteger('views')->default(0);
            $table->timestamps();

            $table->index('category');
            $table->index('published');
            $table->index('featured');
            $table->index('published_at');
        });

        Schema::create('media_items', function (Blueprint $table) {
            $table->id();
            $table->string('url');
            $table->string('type'); // image|video
            $table->string('title')->nullable();
            $table->json('tags')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('type');
            $table->index('uploaded_by');
        });

        Schema::create('contact_messages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('subject')->nullable();
            $table->text('message');
            $table->string('status')->default('new'); // new|read|archived
            $table->string('type')->default('contact'); // contact|public_quote
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('email');
            $table->index('type');
        });

        Schema::create('newsletter_subscribers', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->timestamp('subscribed_at');
            $table->timestamp('unsubscribed_at')->nullable();
        });

        Schema::create('partner_applications', function (Blueprint $table) {
            $table->id();
            $table->string('company');
            $table->string('contact_name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('type')->nullable();
            $table->json('payload')->nullable();
            $table->string('status')->default('pending'); // pending|reviewed|accepted|rejected
            $table->timestamps();

            $table->index('status');
            $table->index('email');
        });

        Schema::create('faqs', function (Blueprint $table) {
            $table->id();
            $table->string('question');
            $table->text('answer');
            $table->integer('sort_order')->default(0);
            $table->boolean('published')->default(true);
            $table->timestamps();

            $table->index(['published', 'sort_order']);
        });

        Schema::create('certifications', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('issuer')->nullable();
            $table->string('image_url')->nullable();
            $table->text('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('published')->default(true);
            $table->timestamps();

            $table->index(['published', 'sort_order']);
        });

        Schema::create('document_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('required_for')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('published')->default(true);
            $table->timestamps();

            $table->index(['published', 'sort_order']);
        });

        Schema::create('testimonials', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('role')->nullable();
            $table->text('content');
            $table->string('avatar_url')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('published')->default(true);
            $table->timestamps();

            $table->index(['published', 'sort_order']);
        });

        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->string('site_name');
            $table->string('tagline')->nullable();
            $table->string('support_email')->nullable();
            $table->string('whatsapp')->nullable();
            $table->boolean('maintenance_mode')->default(false);
            $table->boolean('registration_open')->default(true);
            $table->boolean('kyc_required')->default(false);
            $table->boolean('investment_open')->default(true);
            $table->string('currency')->default('USD');
            $table->decimal('min_investment', 14, 2)->nullable();
            $table->json('payment_methods')->nullable();
            $table->json('notification_prefs')->nullable();
            $table->json('seo')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_settings');
        Schema::dropIfExists('testimonials');
        Schema::dropIfExists('document_types');
        Schema::dropIfExists('certifications');
        Schema::dropIfExists('faqs');
        Schema::dropIfExists('partner_applications');
        Schema::dropIfExists('newsletter_subscribers');
        Schema::dropIfExists('contact_messages');
        Schema::dropIfExists('media_items');
        Schema::dropIfExists('news_articles');
        Schema::dropIfExists('site_settings');
    }
};
