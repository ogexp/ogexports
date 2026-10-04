<?php

namespace Database\Seeders;

use App\Models\Incoterm;
use Illuminate\Database\Seeder;

class IncotermSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['code' => 'FOB', 'label' => 'Free On Board', 'sort_order' => 1],
            ['code' => 'CIF', 'label' => 'Cost, Insurance and Freight', 'sort_order' => 2],
            ['code' => 'CFR', 'label' => 'Cost and Freight', 'sort_order' => 3],
            ['code' => 'DAP', 'label' => 'Delivered At Place', 'sort_order' => 4],
            ['code' => 'EXW', 'label' => 'Ex Works', 'sort_order' => 5],
        ];

        foreach ($rows as $row) {
            Incoterm::query()->updateOrCreate(
                ['code' => $row['code']],
                [
                    'label' => $row['label'],
                    'sort_order' => $row['sort_order'],
                    'is_active' => true,
                ],
            );
        }
    }
}
