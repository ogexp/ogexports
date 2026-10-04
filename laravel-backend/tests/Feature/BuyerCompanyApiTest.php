<?php

use App\Models\ContactPerson;
use App\Models\Country;
use App\Models\Port;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

it('returns buyer company profile data', function () {
    $user = User::factory()->create();
    $user->assignRole('buyer');

    $response = $this->actingAs($user)
        ->withHeader('Origin', 'http://localhost:5000')
        ->getJson('/api/buyer/company');

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                'company',
                'trade_preferences',
                'contacts',
                'kyc' => ['application', 'steps'],
                'verification_pct',
            ],
        ]);
});

it('allows buyer to update company preferences with country ports', function () {
    $user = User::factory()->create();
    $user->assignRole('buyer');
    $user->profile()->create(['country' => 'United Arab Emirates']);

    $country = Country::query()->create(['code' => 'AE', 'name' => 'United Arab Emirates']);
    Port::query()->create([
        'country_id' => $country->id,
        'unlocode' => 'AEJEA',
        'name' => 'Jebel Ali',
    ]);

    $this->actingAs($user)
        ->withHeader('Origin', 'http://localhost:5000')
        ->putJson('/api/buyer/company/preferences', [
            'payment_terms' => 'LC at Sight',
            'incoterm' => 'FOB',
            'shipping' => 'Sea Freight (FCL)',
            'ports' => ['Jebel Ali (AEJEA)'],
            'commodities' => ['Basmati Rice'],
        ])
        ->assertOk()
        ->assertJsonPath('data.payment_terms', 'LC at Sight')
        ->assertJsonPath('data.ports.0', 'Jebel Ali (AEJEA)');
});

it('rejects preferred ports outside the buyer country', function () {
    $user = User::factory()->create();
    $user->assignRole('buyer');
    $user->profile()->create(['country' => 'Pakistan']);

    $pk = Country::query()->create(['code' => 'PK', 'name' => 'Pakistan']);
    $ae = Country::query()->create(['code' => 'AE', 'name' => 'United Arab Emirates']);
    Port::query()->create([
        'country_id' => $pk->id,
        'unlocode' => 'PKKHI',
        'name' => 'Karachi',
    ]);
    Port::query()->create([
        'country_id' => $ae->id,
        'unlocode' => 'AEJEA',
        'name' => 'Jebel Ali',
    ]);

    $this->actingAs($user)
        ->withHeader('Origin', 'http://localhost:5000')
        ->putJson('/api/buyer/company/preferences', [
            'ports' => ['Jebel Ali (AEJEA)'],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['ports']);
});

it('supports contact person CRUD for buyers', function () {
    $user = User::factory()->create();
    $user->assignRole('buyer');
    $origin = 'http://localhost:5000';

    $this->withHeaders([
        'Origin' => $origin,
        'Access-Control-Request-Method' => 'POST',
        'Access-Control-Request-Headers' => 'content-type,x-xsrf-token',
    ])->options('/api/buyer/company/contacts')
        ->assertNoContent()
        ->assertHeader('Access-Control-Allow-Origin', $origin)
        ->assertHeader('Access-Control-Allow-Credentials', 'true');

    $created = $this->actingAs($user)
        ->withHeader('Origin', $origin)
        ->postJson('/api/buyer/company/contacts', [
            'name' => 'Ali Khan',
            'title' => 'Procurement',
            'email' => 'ali@example.com',
            'phone' => '+92 300 1111111',
            'is_primary' => true,
        ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Ali Khan')
        ->assertHeader('Access-Control-Allow-Origin', $origin);

    $id = (int) $created->json('data.id');
    expect(ContactPerson::query()->where('user_id', $user->id)->count())->toBe(1);

    $this->actingAs($user)
        ->withHeader('Origin', $origin)
        ->getJson('/api/buyer/company/contacts')
        ->assertOk()
        ->assertJsonPath('data.0.name', 'Ali Khan');

    $this->actingAs($user)
        ->withHeader('Origin', $origin)
        ->putJson("/api/buyer/company/contacts/{$id}", [
            'name' => 'Ali Khan Updated',
            'title' => 'Head of Procurement',
        ])
        ->assertOk()
        ->assertJsonPath('data.name', 'Ali Khan Updated');

    $this->actingAs($user)
        ->withHeader('Origin', $origin)
        ->deleteJson("/api/buyer/company/contacts/{$id}")
        ->assertOk();

    expect(ContactPerson::query()->where('user_id', $user->id)->count())->toBe(0);
});
