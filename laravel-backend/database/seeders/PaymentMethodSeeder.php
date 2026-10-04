<?php

namespace Database\Seeders;

use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;

class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            [
                'code' => 'lc',
                'label' => 'Letter of Credit (LC at Sight)',
                'description' => 'Bank-to-bank guarantee. Most widely used in agricultural commodity exports. Safest for both parties.',
                'badge' => 'Most Common',
                'fields' => ['LC Issuing Bank Name', 'LC Draft Number (optional)'],
                'sort_order' => 1,
            ],
            [
                'code' => 'tt',
                'label' => '100% Advance TT',
                'description' => 'Wire transfer before shipment. Processed within 2–3 banking days. Full payment secures production slot.',
                'badge' => null,
                'fields' => ['Sending Bank Name', 'Payment Reference / SWIFT Code'],
                'sort_order' => 2,
            ],
            [
                'code' => 'sblc',
                'label' => 'Standby LC (SBLC)',
                'description' => 'Backup payment guarantee via SWIFT MT760. Used for long-term buyer arrangements.',
                'badge' => null,
                'fields' => ['SBLC Issuing Bank', 'SBLC Reference Number'],
                'sort_order' => 3,
            ],
            [
                'code' => 'split',
                'label' => '30% Advance + 70% against BL',
                'description' => '30% TT advance to confirm order, remaining 70% on presentation of Bill of Lading copy.',
                'badge' => null,
                'fields' => ['Sending Bank Name', 'Advance Payment Reference'],
                'sort_order' => 4,
            ],
        ];

        foreach ($rows as $row) {
            PaymentMethod::query()->updateOrCreate(
                ['code' => $row['code']],
                [
                    'label' => $row['label'],
                    'description' => $row['description'],
                    'badge' => $row['badge'],
                    'fields' => $row['fields'],
                    'sort_order' => $row['sort_order'],
                    'is_active' => true,
                ],
            );
        }
    }
}
