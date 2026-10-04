<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            // RoleSeeder::class,
            // CountryPortSeeder::class,
            // IncotermSeeder::class,
            // PaymentMethodSeeder::class,
            // SupplierOfferSettingsSeeder::class,
            // AdminUserSeeder::class,
            // DemoUserSeeder::class,
            // CategoryProductSeeder::class,
            // CmsSeeder::class,
            // ImportedProductSeeder::class,
            // InvestmentSeeder::class,
            // BankAccountSeeder::class,
            // DemoOpsSeeder::class,
            EmailTemplateSeeder::class,
            // FacilityContentSeeder::class, // php artisan db:seed --class=FacilityContentSeeder
        ]);
    }
}
