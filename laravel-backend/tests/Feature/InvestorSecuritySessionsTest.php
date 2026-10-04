<?php

use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->investor = User::factory()->create([
        'account_status' => 'active',
        'email_verified_at' => now(),
    ]);
    $this->investor->assignRole('investor');
});

it('lists mobile access tokens and marks the current device', function () {
    $current = $this->investor->createToken('OG Exports on this phone');
    $other = $this->investor->createToken('OG Exports on tablet');

    $response = $this->withHeader('Authorization', 'Bearer '.$current->plainTextToken)
        ->getJson('/api/me/sessions')
        ->assertOk();

    $sessions = collect($response->json('data'));
    expect($sessions)->toHaveCount(2)
        ->and($sessions->firstWhere('id', 'mobile:'.$current->accessToken->id)['is_current'])->toBeTrue()
        ->and($sessions->firstWhere('id', 'mobile:'.$other->accessToken->id)['is_current'])->toBeFalse()
        ->and($sessions->firstWhere('id', 'mobile:'.$other->accessToken->id)['device'])->toBe('OG Exports on tablet');
});

it('revokes one other mobile device without revoking the current token', function () {
    $current = $this->investor->createToken('Current mobile device');
    $other = $this->investor->createToken('Old mobile device');

    $this->withHeader('Authorization', 'Bearer '.$current->plainTextToken)
        ->deleteJson('/api/me/sessions/mobile:'.$other->accessToken->id)
        ->assertOk()
        ->assertJsonPath('message', 'Mobile session revoked.');

    expect($this->investor->fresh()->tokens()->pluck('name')->all())
        ->toBe(['Current mobile device']);
});

it('revokes every other mobile token and allows the current device to log out', function () {
    $current = $this->investor->createToken('Current mobile device');
    $this->investor->createToken('Other phone');
    $this->investor->createToken('Tablet');

    $this->withHeader('Authorization', 'Bearer '.$current->plainTextToken)
        ->deleteJson('/api/me/sessions/others')
        ->assertOk()
        ->assertJsonPath('count', 2);

    expect($this->investor->fresh()->tokens()->pluck('name')->all())
        ->toBe(['Current mobile device']);

    $this->postJson('/api/auth/mobile/logout')
        ->assertOk()
        ->assertJsonPath('message', 'Logged out successfully.');

    expect($this->investor->fresh()->tokens()->count())->toBe(0);
});