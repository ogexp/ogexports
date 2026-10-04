<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'ogadmin@ogexports.com'],
            [
                'name' => 'OG Admin',
                'phone' => '+92-21-3456-7890',
                'password' => 'Password@123',
                'account_status' => 'active',
                'email_verified_at' => now(),
            ]
        );

        $admin->syncRoles(['admin']);

        $admin->profile()->updateOrCreate(
            ['user_id' => $admin->id],
            [
                'company_name' => 'OG Exports (Pvt) Ltd',
                'country' => 'Pakistan',
                'city' => 'Karachi',
                'address' => 'Plot 45, Block 7, SITE Area, Karachi',
                'trust_score' => 100,
                'dept' => 'Administration',
                'rating' => 5.0,
            ]
        );
    }
}
