<?php

namespace Database\Seeders;

use App\Support\PlatformWalletService;
use Illuminate\Database\Seeder;

class PlatformWalletSeeder extends Seeder
{
    public function run(): void
    {
        PlatformWalletService::ensure('USD');
    }
}
