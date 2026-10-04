<?php

namespace Database\Seeders;

use App\Models\KycApplication;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Rfq;
use App\Models\Shipment;
use App\Models\ShipmentMilestone;
use App\Models\SupplierOffer;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoOpsSeeder extends Seeder
{
    public function run(): void
    {
        $buyer = User::where('email', 'buyer@ogexports.com')->first();
        $supplier = User::where('email', 'supplier@ogexports.com')->first();
        $investor = User::where('email', 'investor@ogexports.com')->first();
        $product = Product::where('slug', 'premium-basmati-rice')->first();

        if ($buyer && $product) {
            $rfq = Rfq::updateOrCreate(
                [
                    'buyer_id' => $buyer->id,
                    'product_id' => $product->id,
                    'destination' => 'Jebel Ali, UAE',
                ],
                [
                    'product_name' => $product->name,
                    'qty' => '25 MT',
                    'incoterm' => 'FOB',
                    'payment_terms' => 'LC at Sight',
                    'notes' => 'Demo RFQ — Super Basmati 5% broken preferred.',
                    'status' => 'new',
                    'submitted_at' => now()->subDays(2),
                ]
            );

            $order = Order::updateOrCreate(
                ['order_number' => 'ORD-DEMO-1001'],
                [
                    'buyer_id' => $buyer->id,
                    'status' => 'confirmed',
                    'payment_status' => 'pending',
                    'payment_method' => 'LC at Sight',
                    'total_value' => 17375,
                    'currency' => 'USD',
                    'notes' => 'Demo order linked to Premium Basmati RFQ #'.$rfq->id,
                    'placed_at' => now()->subDay(),
                ]
            );

            OrderItem::updateOrCreate(
                [
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                ],
                [
                    'product_name' => $product->name,
                    'qty' => '25 MT',
                    'unit_price' => 695,
                    'line_total' => 17375,
                ]
            );

            $shipment = Shipment::updateOrCreate(
                [
                    'order_id' => $order->id,
                    'container' => 'MSKU4829104',
                ],
                [
                    'buyer_id' => $buyer->id,
                    'product_snapshot' => $product->name,
                    'vessel' => 'Maersk Kinloss',
                    'origin' => 'Port Qasim',
                    'destination' => 'Jebel Ali, UAE',
                    'shipping_line' => 'Maersk',
                    'etd' => now()->addDays(5)->toDateString(),
                    'eta' => now()->addDays(14)->toDateString(),
                    'status' => 'booking',
                    'current_milestone' => 'Booking confirmed',
                ]
            );

            ShipmentMilestone::updateOrCreate(
                [
                    'shipment_id' => $shipment->id,
                    'label' => 'Booking confirmed',
                ],
                [
                    'occurred_at' => now()->subHours(6),
                    'notes' => 'Demo milestone — vessel slot reserved.',
                ]
            );
        }

        if ($supplier) {
            SupplierOffer::updateOrCreate(
                [
                    'supplier_id' => $supplier->id,
                    'product_name' => 'IRRI-6 Rice — 5% Broken',
                ],
                [
                    'category' => 'Rice',
                    'origin' => 'Pakistan',
                    'specifications' => 'Long grain IRRI-6, moisture 14% max, double sortex optional.',
                    'available_qty' => '1,200 MT',
                    'price_fob' => '$420/MT',
                    'incoterm' => 'FOB',
                    'price_unit' => 'MT',
                    'moq' => '27 MT',
                    'lead_time' => '5–10 days',
                    'packaging' => '50 KG PP bags',
                    'payment_terms' => 'LC at Sight / TT',
                    'certifications' => ['Phytosanitary', 'COA', 'Fumigation'],
                    'valid_until' => now()->addMonth()->toDateString(),
                    'hs_code' => '1006.30',
                    'status' => 'pending',
                    'submitted_at' => now()->subDays(1),
                ]
            );
        }

        foreach ([$buyer, $supplier, $investor] as $user) {
            if (! $user) {
                continue;
            }

            KycApplication::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'status' => 'pending',
                ],
                [
                    'type' => $user->email === 'investor@ogexports.com' ? 'individual' : 'company',
                    'country' => $user->profile?->country ?? 'Pakistan',
                    'risk' => 'low',
                    'submitted_at' => now()->subDays(3),
                    'notes' => 'Demo KYC — awaiting compliance review.',
                    'payload' => [
                        'company' => $user->profile?->company_name,
                        'email' => $user->email,
                    ],
                ]
            );
        }
    }
}
