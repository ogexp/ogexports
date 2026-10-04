<?php

use App\Support\SupplierMarket;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $legacyLabels = [
            '100% Advance TT',
            '50% Advance / 50% BL',
            'LC at Sight',
            'LC 30 Days',
            'CAD / DP',
            'Open Account (60 days)',
        ];

        DB::table('supplier_payment_terms')
            ->whereIn('label', $legacyLabels)
            ->update(['is_active' => false, 'updated_at' => now()]);

        $newTerms = [
            'Cash',
            '15 Days',
            '30 Days',
        ];

        foreach ([SupplierMarket::INTERNATIONAL, SupplierMarket::PAKISTAN] as $market) {
            foreach ($newTerms as $index => $label) {
                DB::table('supplier_payment_terms')->updateOrInsert(
                    ['market' => $market, 'label' => $label],
                    [
                        'sort_order' => $index + 1,
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                );
            }
        }
    }

    public function down(): void
    {
        $newTerms = [
            'Cash',
            '15 Days',
            '30 Days',
        ];

        DB::table('supplier_payment_terms')
            ->whereIn('label', $newTerms)
            ->update(['is_active' => false, 'updated_at' => now()]);

        $legacyLabels = [
            '100% Advance TT',
            '50% Advance / 50% BL',
            'LC at Sight',
            'LC 30 Days',
            'CAD / DP',
            'Open Account (60 days)',
        ];

        foreach ($legacyLabels as $index => $label) {
            DB::table('supplier_payment_terms')->updateOrInsert(
                ['market' => SupplierMarket::INTERNATIONAL, 'label' => $label],
                [
                    'sort_order' => $index + 1,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            );
        }
    }
};
