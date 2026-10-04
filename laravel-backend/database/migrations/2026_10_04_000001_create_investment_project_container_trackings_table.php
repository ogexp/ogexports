<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investment_project_container_trackings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_project_id')
                ->unique()
                ->constrained('investment_projects')
                ->cascadeOnDelete();
            $table->string('container_number', 80)->nullable();
            $table->string('bill_of_lading_number', 120)->nullable();
            $table->string('vessel_name', 160)->nullable();
            $table->string('port_of_loading', 160)->nullable();
            $table->string('destination_port', 160)->nullable();
            $table->string('etd', 64)->nullable();
            $table->string('eta', 64)->nullable();
            $table->string('latest_tracking_update', 1000)->nullable();
            $table->string('trade_status', 80)->nullable();
            $table->json('container_journey');
            $table->timestamp('tracking_updated_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investment_project_container_trackings');
    }
};
