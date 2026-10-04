<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone')->nullable()->after('email');
            $table->string('account_status')->default('active')->after('password'); // active|suspended|inactive
            $table->timestamp('last_seen_at')->nullable()->after('remember_token');
        });

        Schema::create('user_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('company_name')->nullable();
            $table->string('country')->nullable();
            $table->string('city')->nullable();
            $table->string('address')->nullable();
            $table->string('avatar_url')->nullable();
            $table->unsignedTinyInteger('trust_score')->default(0);
            $table->string('dept')->nullable();
            $table->string('category')->nullable();
            $table->string('capacity')->nullable();
            $table->decimal('rating', 3, 2)->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_profiles');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'account_status', 'last_seen_at']);
        });
    }
};
