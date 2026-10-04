<?php

namespace Database\Seeders;

use App\Models\ImportedProduct;
use Illuminate\Database\Seeder;

class ImportedProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            [
                'sku' => 'IMP-001',
                'name' => 'Malaysian Palm Oil (RBD Olein)',
                'category' => 'Edible Oils',
                'origin' => 'Malaysia',
                'description' => 'CP8 grade, FFA max 0.1%, IV 56–59. Ideal for cooking and food manufacturing.',
                'price' => '$985/MT',
                'price_visible' => true,
                'status' => 'available',
                'specs' => [
                    'grade' => 'CP8',
                    'ffa' => '≤ 0.1%',
                    'packaging' => 'Flexi / Drums',
                    'moq' => '20 MT',
                    'stock' => '120 MT',
                    'warehouse' => 'Karachi Port',
                    'tags' => ['CP8 Grade', 'FFA ≤ 0.1%', 'Halal Certified'],
                ],
            ],
            [
                'sku' => 'IMP-002',
                'name' => 'Sri Lankan Ceylon Black Tea',
                'category' => 'Beverages',
                'origin' => 'Sri Lanka',
                'description' => 'BOPF grade, garden fresh, moisture max 7%. Premium high-grown Ceylon leaf.',
                'price' => '$3,150/MT',
                'price_visible' => true,
                'status' => 'available',
                'specs' => [
                    'grade' => 'BOPF',
                    'packaging' => '40kg Paper Sacks',
                    'moq' => '2 MT',
                    'stock' => '18 MT',
                    'warehouse' => 'Lahore Warehouse',
                    'tags' => ['BOPF Grade', 'High Grown', 'ISO 3720'],
                ],
            ],
            [
                'sku' => 'IMP-003',
                'name' => 'Indonesian Robusta Coffee Beans',
                'category' => 'Beverages',
                'origin' => 'Indonesia',
                'description' => 'Grade 1, screen 16+, moisture 12.5% max. Strong body, ideal for espresso blends.',
                'price' => null,
                'price_visible' => false,
                'status' => 'limited',
                'specs' => [
                    'grade' => 'Grade 1',
                    'packaging' => '60kg Jute Bags',
                    'moq' => '1 MT',
                    'stock' => '6 MT',
                    'warehouse' => 'Karachi Port',
                    'tags' => ['Grade 1', 'Screen 16+', 'Sun Dried'],
                ],
            ],
            [
                'sku' => 'IMP-004',
                'name' => 'Chinese Ginger (Fresh)',
                'category' => 'Vegetables',
                'origin' => 'China',
                'description' => 'Air-dried fresh ginger, 150g+ rhizomes, clean skin, low fiber.',
                'price' => '$1,240/MT',
                'price_visible' => true,
                'status' => 'available',
                'specs' => [
                    'size' => '150g+',
                    'packaging' => '10kg Cartons',
                    'moq' => '5 MT',
                    'stock' => '40 MT',
                    'warehouse' => 'Karachi Cold Store',
                    'tags' => ['150g+ Size', 'Washed', 'Cold Chain'],
                ],
            ],
            [
                'sku' => 'IMP-005',
                'name' => 'Kenyan AA Coffee Beans',
                'category' => 'Beverages',
                'origin' => 'Kenya',
                'description' => 'AA grade arabica, bright acidity, blackcurrant notes. Arriving next consignment.',
                'price' => null,
                'price_visible' => false,
                'status' => 'coming-soon',
                'specs' => [
                    'grade' => 'AA',
                    'packaging' => '60kg Jute Bags',
                    'moq' => '1 MT',
                    'stock' => 'Incoming 12 MT',
                    'warehouse' => 'In Transit',
                    'tags' => ['AA Grade', 'Arabica', 'SL28 Variety'],
                ],
            ],
            [
                'sku' => 'IMP-006',
                'name' => 'Thai Jasmine Rice (Hom Mali)',
                'category' => 'Grains',
                'origin' => 'Thailand',
                'description' => 'Premium Hom Mali 92% purity, new crop. Restock expected soon.',
                'price' => null,
                'price_visible' => false,
                'status' => 'out-of-stock',
                'specs' => [
                    'purity' => '92%',
                    'packaging' => '25kg PP Bags',
                    'moq' => '10 MT',
                    'stock' => '0 MT',
                    'warehouse' => 'Karachi Port',
                    'tags' => ['92% Purity', 'New Crop', 'Fragrant'],
                ],
            ],
        ];

        foreach ($products as $product) {
            ImportedProduct::updateOrCreate(
                ['sku' => $product['sku']],
                $product
            );
        }
    }
}
