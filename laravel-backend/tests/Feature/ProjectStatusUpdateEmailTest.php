<?php

use App\Models\AppNotification;
use App\Models\Investment;
use App\Models\InvestmentProject;
use App\Models\PlatformSetting;
use App\Models\User;
use Database\Seeders\EmailTemplateSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->seed(EmailTemplateSeeder::class);

    PlatformSetting::query()->create([
        'site_name' => 'OG Exports',
        'registration_open' => true,
        'investment_open' => true,
        'supplier_module_enabled' => true,
        'investment_module_enabled' => true,
        'currency' => 'USD',
    ]);

    $this->admin = User::factory()->create(['account_status' => 'active']);
    $this->admin->assignRole('admin');

    config(['mail.default' => 'array']);
});

it('emails all investors when a container project status is updated', function () {
    Mail::fake();

    $project = InvestmentProject::query()->create([
        'title' => 'Multi Investor Container',
        'type' => 'container',
        'status' => 'funding',
        'target_amount' => 30000,
        'raised_amount' => 3000,
        'investors_count' => 3,
        'current_project_stage' => 'Raising',
    ]);

    $investors = collect(range(1, 3))->map(function (int $i) {
        $user = User::factory()->create([
            'account_status' => 'active',
            'email' => "investor{$i}@example.com",
            'name' => "Investor {$i}",
        ]);
        $user->assignRole('investor');

        return $user;
    });

    foreach ($investors as $investor) {
        Investment::query()->create([
            'project_id' => $project->id,
            'investor_id' => $investor->id,
            'amount' => 1000,
            'status' => 'active',
            'invested_at' => now(),
            'approved_at' => now(),
        ]);
    }

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->putJson("/api/admin/investment-projects/{$project->id}", [
            'status' => 'in_transit',
            'current_project_stage' => 'Shipping',
            'vessel' => 'MV Ocean Star',
        ])
        ->assertOk();

    foreach ($investors as $investor) {
        expect(
            AppNotification::query()
                ->where('user_id', $investor->id)
                ->where('title', 'Project update — Multi Investor Container')
                ->exists()
        )->toBeTrue();
    }
});

it('emails all investors when a non-container project status is updated', function () {
    $project = InvestmentProject::query()->create([
        'title' => 'Fresh Produce Deal',
        'type' => 'produce',
        'status' => 'funding',
        'target_amount' => 20000,
        'raised_amount' => 2000,
        'investors_count' => 2,
        'current_project_stage' => 'Open',
    ]);

    $investors = collect(range(1, 2))->map(function (int $i) {
        $user = User::factory()->create([
            'account_status' => 'active',
            'email' => "produce{$i}@example.com",
            'name' => "Produce Investor {$i}",
        ]);
        $user->assignRole('investor');

        return $user;
    });

    foreach ($investors as $investor) {
        Investment::query()->create([
            'project_id' => $project->id,
            'investor_id' => $investor->id,
            'amount' => 1000,
            'status' => 'active',
            'invested_at' => now(),
            'approved_at' => now(),
        ]);
    }

    $this->actingAs($this->admin)
        ->withHeader('Origin', 'http://localhost:5000')
        ->putJson("/api/admin/investment-projects/{$project->id}", [
            'status' => 'active',
            'current_project_stage' => 'Harvesting',
        ])
        ->assertOk();

    foreach ($investors as $investor) {
        expect(
            AppNotification::query()
                ->where('user_id', $investor->id)
                ->where('title', 'Project update — Fresh Produce Deal')
                ->exists()
        )->toBeTrue();
    }
});
