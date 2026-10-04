<?php

namespace Database\Seeders;

use App\Models\SupplierCertification;
use App\Models\SupplierPackagingSize;
use App\Models\SupplierPaymentTerm;
use App\Support\SupplierMarket;
use Illuminate\Database\Seeder;

class SupplierOfferSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $certifications = [
            'HACCP',
            'ISO 22000',
            'GlobalG.A.P.',
            'Organic',
            'Halal',
            'BRC',
            'FDA Registered',
            'Phytosanitary',
        ];

        foreach ($certifications as $index => $label) {
            SupplierCertification::query()->updateOrCreate(
                ['market' => SupplierMarket::INTERNATIONAL, 'label' => $label],
                [
                    'sort_order' => $index + 1,
                    'is_active' => true,
                ],
            );
        }

        $paymentTerms = [
            'Cash',
            '15 Days',
            '30 Days',
        ];

        foreach ([SupplierMarket::INTERNATIONAL, SupplierMarket::PAKISTAN] as $market) {
            foreach ($paymentTerms as $index => $label) {
                SupplierPaymentTerm::query()->updateOrCreate(
                    ['market' => $market, 'label' => $label],
                    [
                        'sort_order' => $index + 1,
                        'is_active' => true,
                    ],
                );
            }
        }

        $packagingSizes = [
            '40 KG Bag',
            '25 KG Bag',
            '20 KG Bag',
            '50 KG Bag',
            'KG',
            'MT',
            'Ton',
            'Box',
            'Carton',
            'Pallet',
            'Container',
        ];

        foreach ($packagingSizes as $index => $label) {
            SupplierPackagingSize::query()->updateOrCreate(
                ['label' => $label],
                [
                    'sort_order' => $index + 1,
                    'is_active' => true,
                ],
            );
        }
    }
}
