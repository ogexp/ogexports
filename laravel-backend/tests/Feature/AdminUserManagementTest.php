<?php

use App\Models\User;
use App\Models\UserProfile;
use App\Models\Wallet;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->admin = User::factory()->create([
        'account_status' => 'active',
        'name' => 'Admin',
    ]);
    $this->admin->assignRole('admin');
});

it('hard deletes a buyer and removes the user row', function () {
    $buyer = User::factory()->create([
        'account_status' => 'active',
        'email' => 'buyer-delete@example.com',
    ]);
    $buyer->assignRole('buyer');
    UserProfile::create([
        'user_id' => $buyer->id,
        'country' => 'United States',
    ]);

    $this->actingAs($this->admin)
        ->deleteJson("/api/admin/users/{$buyer->id}")
        ->assertOk()
        ->assertJsonPath('message', 'User deleted.');

    $this->assertDatabaseMissing('users', ['id' => $buyer->id]);
    $this->assertDatabaseMissing('user_profiles', ['user_id' => $buyer->id]);
});

it('refuses to delete the signed-in admin', function () {
    $this->actingAs($this->admin)
        ->deleteJson("/api/admin/users/{$this->admin->id}")
        ->assertStatus(422)
        ->assertJsonPath('message', 'Cannot delete yourself.');

    $this->assertDatabaseHas('users', ['id' => $this->admin->id]);
});

it('refuses to delete another admin user', function () {
    $other = User::factory()->create(['account_status' => 'active']);
    $other->assignRole('admin');

    $this->actingAs($this->admin)
        ->deleteJson("/api/admin/users/{$other->id}")
        ->assertStatus(422)
        ->assertJsonPath('message', 'Cannot delete admin users.');

    $this->assertDatabaseHas('users', ['id' => $other->id]);
});

it('creates an investor wallet in USD regardless of profile country', function () {
    $this->actingAs($this->admin)
        ->postJson('/api/admin/users', [
            'name' => 'Karachi Investor',
            'email' => 'investor-create@example.com',
            'password' => 'password',
            'phone' => '+92 3000000000',
            'role' => 'investor',
            'country' => 'Pakistan',
        ])
        ->assertCreated()
        ->assertJsonPath('data.email', 'investor-create@example.com');

    $user = User::query()->where('email', 'investor-create@example.com')->first();
    expect($user)->not->toBeNull()
        ->and($user->email_verified_at)->not->toBeNull()
        ->and($user->account_status)->toBe('active')
        ->and($user->hasRole('investor'))->toBeTrue();

    $this->assertDatabaseHas('user_profiles', [
        'user_id' => $user->id,
        'country' => 'Pakistan',
    ]);

    $wallet = Wallet::query()->where('user_id', $user->id)->first();
    expect($wallet)->not->toBeNull()
        ->and($wallet->currency)->toBe('USD');
});
