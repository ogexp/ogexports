<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->json('status_timeline')->nullable()->after('status');
        });

        $rows = DB::table('orders')->select(['id', 'status', 'placed_at', 'created_at'])->get();

        foreach ($rows as $row) {
            $old = strtolower((string) $row->status);
            $new = match ($old) {
                'pending', 'confirmed' => 'order_confirmed',
                'shipping', 'shipped', 'in-transit', 'in_transit' => 'in_transit',
                'production', 'in_production', 'in-production' => 'production',
                'delivered' => 'delivered',
                'cancelled', 'canceled' => 'cancelled',
                'payment', 'payment_confirmed', 'paid' => 'payment',
                'quality_inspection' => 'quality_inspection',
                'loaded_at_port' => 'loaded_at_port',
                'order_confirmed' => 'order_confirmed',
                default => 'order_confirmed',
            };

            $placed = $row->placed_at ?? $row->created_at;
            $date = $placed ? substr((string) $placed, 0, 10) : now()->toDateString();

            $timeline = [
                'order_confirmed' => null,
                'payment' => null,
                'production' => null,
                'quality_inspection' => null,
                'loaded_at_port' => null,
                'in_transit' => null,
                'delivered' => null,
            ];

            $order = [
                'order_confirmed',
                'payment',
                'production',
                'quality_inspection',
                'loaded_at_port',
                'in_transit',
                'delivered',
            ];

            if ($new === 'cancelled') {
                $timeline['order_confirmed'] = $date;
            } else {
                $idx = array_search($new, $order, true);
                if ($idx === false) {
                    $idx = 0;
                    $new = 'order_confirmed';
                }
                for ($i = 0; $i <= $idx; $i++) {
                    $timeline[$order[$i]] = $date;
                }
            }

            DB::table('orders')->where('id', $row->id)->update([
                'status' => $new,
                'status_timeline' => json_encode($timeline),
            ]);
        }
    }

    public function down(): void
    {
        $rows = DB::table('orders')->select(['id', 'status'])->get();
        foreach ($rows as $row) {
            $old = match (strtolower((string) $row->status)) {
                'order_confirmed' => 'pending',
                'payment' => 'confirmed',
                'production', 'quality_inspection' => 'production',
                'loaded_at_port', 'in_transit' => 'shipping',
                'delivered' => 'delivered',
                'cancelled' => 'cancelled',
                default => 'pending',
            };
            DB::table('orders')->where('id', $row->id)->update(['status' => $old]);
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('status_timeline');
        });
    }
};
