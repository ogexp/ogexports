<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DemoUserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'email' => 'buyer@ogexports.com',
                'name' => 'Demo Buyer',
                'role' => 'buyer',
                'phone' => '+971-50-123-4567',
                'profile' => [
                    'company_name' => 'Sunrise Imports LLC',
                    'country' => 'United Arab Emirates',
                    'city' => 'Dubai',
                    'address' => 'Jebel Ali Free Zone',
                    'trust_score' => 85,
                    'category' => 'Importer',
                ],
                'wallet' => null,
            ],
            [
                'email' => 'supplier@ogexports.com',
                'name' => 'Demo Supplier',
                'role' => 'supplier',
                'phone' => '+92-300-555-1212',
                'profile' => [
                    'company_name' => 'Punjab Agro Mills',
                    'country' => 'Pakistan',
                    'city' => 'Depalpur',
                    'address' => 'Rice Mill Road, Depalpur, Punjab',
                    'trust_score' => 78,
                    'category' => 'Rice & Grains',
                    'capacity' => '2,000 MT/month',
                ],
                'wallet' => null,
            ],
            [
                'email' => 'investor@ogexports.com',
                'name' => 'Demo Investor',
                'role' => 'investor',
                'phone' => '+92-333-111-2233',
                'profile' => [
                    'company_name' => 'Demo Capital Partners',
                    'country' => 'Pakistan',
                    'city' => 'Lahore',
                    'address' => 'Gulberg III, Lahore',
                    'trust_score' => 90,
                    'category' => 'Trade Finance',
                ],
                'wallet' => [
                    'currency' => 'USD',
                    'available_balance' => 25000,
                    'pending_balance' => 0,
                ],
            ],
        ];

        foreach ($users as $data) {
            $password = $data['email'] === 'investor@ogexports.com'
                ? '12345678'
                : 'Password@123';

            $user = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'phone' => $data['phone'],
                    'password' => $password,
                    'account_status' => 'active',
                    'email_verified_at' => now(),
                ]
            );

            $user->syncRoles([$data['role']]);

            $user->profile()->updateOrCreate(
                ['user_id' => $user->id],
                $data['profile']
            );

            if ($data['wallet'] !== null) {
                $user->wallet()->updateOrCreate(
                    ['user_id' => $user->id],
                    $data['wallet']
                );
            }
        }
    }
}
