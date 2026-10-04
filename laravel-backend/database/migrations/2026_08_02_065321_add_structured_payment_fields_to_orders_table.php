<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('payment_method_code', 50)->nullable()->after('payment_method');
            $table->string('payment_field1_label')->nullable()->after('payment_method_code');
            $table->string('payment_field1_value')->nullable()->after('payment_field1_label');
            $table->string('payment_field2_label')->nullable()->after('payment_field1_value');
            $table->string('payment_field2_value')->nullable()->after('payment_field2_label');
            $table->string('payment_reference')->nullable()->after('payment_field2_value');
            $table->timestamp('payment_submitted_at')->nullable()->after('payment_reference');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'payment_method_code',
                'payment_field1_label',
                'payment_field1_value',
                'payment_field2_label',
                'payment_field2_value',
                'payment_reference',
                'payment_submitted_at',
            ]);
        });
    }
};
