<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('contact_messages')) {
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

            return;
        }

        Schema::table('contact_messages', function (Blueprint $table) {
            if (! Schema::hasColumn('contact_messages', 'type')) {
                $table->string('type')->default('contact')->after('status');
            }
            if (! Schema::hasColumn('contact_messages', 'meta')) {
                $table->json('meta')->nullable()->after('type');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('contact_messages')) {
            return;
        }

        Schema::table('contact_messages', function (Blueprint $table) {
            $drop = [];
            if (Schema::hasColumn('contact_messages', 'type')) {
                $drop[] = 'type';
            }
            if (Schema::hasColumn('contact_messages', 'meta')) {
                $drop[] = 'meta';
            }
            if ($drop !== []) {
                $table->dropColumn($drop);
            }
        });
    }
};
