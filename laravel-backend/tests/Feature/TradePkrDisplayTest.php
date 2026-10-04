<?php

use App\Models\PlatformSetting;
use App\Models\SupplierOffer;
use App\Models\User;
use App\Models\UserProfile;
use App\Support\ExchangeRateService;
use App\Support\TradeAmountSnapshot;
use App\Support\UserDisplayCurrency;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    ExchangeRateService::clearCache();
    config(['currency.fallback_rates' => [
        'USD' => 1,
        'PKR' => 278.5,
    ]]);
    Http::fake(['*' => Http::response(null, 500)]);

    PlatformSetting::query()->create([
        'site_name' => 'OG Exports',
        'registration_open' => true,
        'investment_open' => true,
        'supplier_module_enabled' => true,
        'investment_module_enabled' => true,
        'supplier_pkr_display_enabled' => true,
        'buyer_pkr_display_enabled' => true,
        'invest_pkr_display_enabled' => true,
        'currency' => 'USD',
    ]);
});

function pkUserWithRole(string $role): User
{
    $user = User::factory()->create(['account_status' => 'active']);
    $user->assignRole($role);

    UserProfile::query()->create([
        'user_id' => $user->id,
        'country' => 'Pakistan',
        'company_name' => 'PK Trade Co',
    ]);

    return $user->fresh(['profile']);
}

it('defaults supplier and buyer pkr display flags to true', function () {
    expect(PlatformSetting::supplierPkrDisplayEnabled())->toBeTrue()
        ->and(PlatformSetting::buyerPkrDisplayEnabled())->toBeTrue();

    $this->getJson('/api/settings')
        ->assertOk()
        ->assertJsonPath('data.supplier_pkr_display_enabled', true)
        ->assertJsonPath('data.buyer_pkr_display_enabled', true);
});

it('exposes trade pkr flags on /api/me', function () {
    $supplier = pkUserWithRole('supplier');

    $this->actingAs($supplier)
        ->getJson('/api/me')
        ->assertOk()
        ->assertJsonPath('supplier_pkr_display_enabled', true)
        ->assertJsonPath('buyer_pkr_display_enabled', true)
        ->assertJsonPath('supplierPkrDisplayEnabled', true)
        ->assertJsonPath('buyerPkrDisplayEnabled', true);
});

it('shows pkr for pakistani supplier when flag on and usd when off', function () {
    $supplier = pkUserWithRole('supplier');

    expect(UserDisplayCurrency::shouldDisplayPkrForRole($supplier, 'supplier'))->toBeTrue()
        ->and(UserDisplayCurrency::formatTradeAmount($supplier, 'supplier', 1000, 'PKR'))
        ->toStartWith('PKR');

    PlatformSetting::query()->first()->update(['supplier_pkr_display_enabled' => false]);

    expect(UserDisplayCurrency::shouldDisplayPkrForRole($supplier, 'supplier'))->toBeFalse()
        ->and(UserDisplayCurrency::formatTradeAmount($supplier, 'supplier', 1000, 'PKR'))
        ->toStartWith('$');
});

it('shows pkr for pakistani buyer when flag on and usd when off', function () {
    $buyer = pkUserWithRole('buyer');

    expect(UserDisplayCurrency::shouldDisplayPkrForRole($buyer, 'buyer'))->toBeTrue();

    PlatformSetting::query()->first()->update(['buyer_pkr_display_enabled' => false]);

    expect(UserDisplayCurrency::shouldDisplayPkrForRole($buyer, 'buyer'))->toBeFalse()
        ->and(UserDisplayCurrency::formatTradeAmount($buyer, 'buyer', 500, 'USD'))
        ->toStartWith('$');
});

it('snapshots fx when supplier creates an offer', function () {
    $supplier = pkUserWithRole('supplier');

    $snap = TradeAmountSnapshot::fromNative(1000.0, 'PKR');

    $offer = SupplierOffer::query()->create([
        'supplier_id' => $supplier->id,
        'category' => 'rice',
        'product_name' => 'Basmati',
        'origin' => 'Punjab',
        'specifications' => 'Grade A',
        'available_qty' => '10',
        'price_fob' => '100',
        'currency' => 'PKR',
        'exchange_rate' => $snap['exchange_rate'],
        'line_value_usd' => $snap['amount_usd'],
        'line_value_pkr' => $snap['amount_pkr'],
        'moq' => '1',
        'lead_time' => '7 days',
        'packaging' => '40 KG',
        'payment_terms' => 'Cash',
        'status' => 'pending',
        'submitted_at' => now(),
        'images' => [],
    ]);

    expect((float) $offer->exchange_rate)->toBeGreaterThan(0)
        ->and((float) $offer->line_value_usd)->toBeGreaterThan(0)
        ->and((float) $offer->line_value_pkr)->toBe(1000.0);
});

it('includes display currency and snapshot fields on supplier dashboard', function () {
    $supplier = pkUserWithRole('supplier');
    $snap = TradeAmountSnapshot::fromNative(27850.0, 'PKR');

    SupplierOffer::query()->create([
        'supplier_id' => $supplier->id,
        'category' => 'rice',
        'product_name' => 'Basmati',
        'origin' => 'Punjab',
        'specifications' => 'Grade A',
        'available_qty' => '100',
        'price_fob' => '278.5',
        'currency' => 'PKR',
        'exchange_rate' => $snap['exchange_rate'],
        'line_value_usd' => $snap['amount_usd'],
        'line_value_pkr' => $snap['amount_pkr'],
        'moq' => '1',
        'lead_time' => '7 days',
        'packaging' => '40 KG',
        'payment_terms' => 'Cash',
        'status' => 'approved',
        'submitted_at' => now(),
        'images' => [],
    ]);

    $response = $this->actingAs($supplier)
        ->getJson('/api/supplier/dashboard')
        ->assertOk()
        ->assertJsonPath('data.supplier.display_currency', 'PKR')
        ->assertJsonPath('data.supplier.display_pkr', true);

    expect((float) $response->json('data.portfolio.0.line_value_pkr'))->toBe((float) $snap['amount_pkr']);
});

it('resolves legacy amounts with live rate when snapshots missing', function () {
    $resolved = TradeAmountSnapshot::resolve(100.0, 'USD');

    expect($resolved['usd'])->toBe(100.0)
        ->and($resolved['pkr'])->toBe(27850.0)
        ->and($resolved['rate'])->toBe(278.5);
});

it('allows admin to update supplier and buyer pkr display settings', function () {
    $admin = User::factory()->create(['account_status' => 'active']);
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->putJson('/api/admin/cms/platform-settings', [
            'supplier_pkr_display_enabled' => false,
            'buyer_pkr_display_enabled' => false,
        ])
        ->assertOk();

    expect(PlatformSetting::supplierPkrDisplayEnabled())->toBeFalse()
        ->and(PlatformSetting::buyerPkrDisplayEnabled())->toBeFalse();
});

it('exposes shared exchange rates for authenticated users', function () {
    $buyer = pkUserWithRole('buyer');

    $this->actingAs($buyer)
        ->getJson('/api/exchange-rates')
        ->assertOk()
        ->assertJsonPath('data.base', 'USD')
        ->assertJsonStructure(['data' => ['rates' => ['PKR']]]);
});
