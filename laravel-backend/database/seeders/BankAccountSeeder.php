<?php

namespace Database\Seeders;

use App\Models\BankAccount;
use Illuminate\Database\Seeder;

class BankAccountSeeder extends Seeder
{
    public function run(): void
    {
        BankAccount::updateOrCreate(
            ['account_number' => '7234567890123456'],
            [
                'bank_name' => 'Habib Bank Limited (HBL)',
                'account_title' => 'OG Exports (Private) Limited',
                'iban' => 'PK36HABB0000020003891069',
                'swift' => 'HABBPKKA',
                'currency' => 'USD',
                'is_active' => true,
                'is_default' => true,
                'instructions' => 'Use SWIFT HABBPKKA. Include your investor email as payment reference.',
                'notes' => 'Primary account for investor deposits',
            ]
        );
    }
}
