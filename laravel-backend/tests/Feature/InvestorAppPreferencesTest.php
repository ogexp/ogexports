<?php

use App\Models\User;
use App\Models\UserProfile;
use App\Models\Wallet;
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
    UserProfile::query()->create([
        'user_id' => $this->investor->id,
        'meta' => ['preferences' => [
            'language' => 'en', 'currency' => 'USD', 'appearance' => 'light',
            'theme' => 'light', 'existing_option' => 'keep',
        ]],
    ]);
    $this->actingAs($this->investor, 'sanctum');
});

it('retains each supported language through validation and profile reload', function (string $language) {
    $this->putJson('/api/investor/profile', ['preferences' => ['language' => $language]])
        ->assertOk()->assertJsonPath('data.preferences.language', $language);
    $this->getJson('/api/investor/profile')->assertOk()
        ->assertJsonPath('data.preferences.language', $language)
        ->assertJsonPath('data.preferences.existing_option', 'keep')
        ->assertJsonPath('data.preferences.currency', 'USD');
})->with(['en', 'ur', 'ar']);

it('retains every appearance and keeps the legacy theme alias aligned', function (string $appearance) {
    $this->putJson('/api/investor/profile', ['preferences' => ['appearance' => $appearance]])
        ->assertOk()
        ->assertJsonPath('data.preferences.appearance', $appearance)
        ->assertJsonPath('data.preferences.theme', $appearance);
})->with(['light', 'dark', 'system']);

it('accepts the legacy theme field without leaving a stale mobile appearance', function () {
    $this->putJson('/api/investor/profile', ['preferences' => ['theme' => 'dark']])
        ->assertOk()->assertJsonPath('data.preferences.appearance', 'dark')
        ->assertJsonPath('data.preferences.theme', 'dark');
});

it('stores display currency without changing wallet denomination or money', function (string $currency) {
    $wallet = Wallet::query()->create([
        'user_id' => $this->investor->id, 'currency' => 'USD',
        'available_balance' => 123, 'pending_balance' => 0,
    ]);
    $this->putJson('/api/investor/profile', ['preferences' => ['currency' => $currency]])
        ->assertOk()->assertJsonPath('data.preferences.currency', $currency);
    expect($wallet->fresh()->currency)->toBe('USD')
        ->and((float) $wallet->fresh()->available_balance)->toBe(123.0);
})->with(['USD', 'PKR', 'EUR', 'GBP']);

it('rejects unsupported preference values without altering saved choices', function (string $field, string $value) {
    $this->putJson('/api/investor/profile', ['preferences' => [$field => $value]])
        ->assertUnprocessable()->assertJsonValidationErrors("preferences.$field");
    expect($this->investor->profile->fresh()->meta['preferences']['language'])->toBe('en');
})->with([
    ['language', 'invalid'], ['appearance', 'invalid'], ['theme', 'invalid'], ['currency', 'INVALID'],
]);
