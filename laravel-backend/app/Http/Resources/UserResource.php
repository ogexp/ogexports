<?php

namespace App\Http\Resources;

use App\Support\UserDisplayCurrency;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\User */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $role = $this->primaryRole();
        $currencyCtx = UserDisplayCurrency::contextForUser($this->resource);

        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'fullName' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'accountType' => $role,
            'account_type' => $role,
            'accountStatus' => $this->account_status,
            'emailVerified' => $this->isEmailVerified(),
            'emailVerifiedAt' => $this->email_verified_at?->toIso8601String(),
            'twoFactorEnabled' => (bool) $this->two_factor_enabled,
            'roles' => $this->getRoleNames()->values(),
            'permissions' => $this->getAllPermissions()->pluck('name')->values(),
            'profile' => $this->whenLoaded('profile', fn () => [
                'companyName' => $this->profile?->company_name,
                'country' => $this->profile?->country,
                'city' => $this->profile?->city,
                'address' => $this->profile?->address,
                'avatarUrl' => $this->profile?->avatar_url,
                'trustScore' => $this->profile?->trust_score,
                'dept' => $this->profile?->dept,
                'category' => $this->profile?->category,
                'capacity' => $this->profile?->capacity,
                'rating' => $this->profile?->rating,
                'meta' => $this->profile?->meta,
            ]),
            'latestKycApplication' => $this->whenLoaded('latestKycApplication', function () {
                $kyc = $this->latestKycApplication;
                if (! $kyc) {
                    return null;
                }

                return [
                    'id' => $kyc->id,
                    'status' => $kyc->status,
                    'type' => $kyc->type,
                    'submittedAt' => $kyc->submitted_at?->toIso8601String(),
                    'documentCount' => $kyc->relationLoaded('documents') ? $kyc->documents->count() : null,
                ];
            }),
            'dashboardPath' => $this->dashboardPath(),
            'createdAt' => $this->created_at?->toIso8601String(),
            'lastSeenAt' => $this->last_seen_at?->toIso8601String(),
            'country' => $currencyCtx['country'],
            'walletCurrency' => $currencyCtx['wallet_currency'],
            'displayCurrency' => $currencyCtx['display_pkr'] ? 'PKR' : ($currencyCtx['currency'] === 'PKR' && ! UserDisplayCurrency::pkrDisplayEnabled() ? 'USD' : $currencyCtx['currency']),
            'displayPkr' => $currencyCtx['display_pkr'],
            'investPkrDisplayEnabled' => UserDisplayCurrency::pkrDisplayEnabled(),
            'invest_pkr_display_enabled' => UserDisplayCurrency::pkrDisplayEnabled(),
            'investDualCurrencyEnabled' => UserDisplayCurrency::dualCurrencyEnabled(),
            'invest_dual_currency_enabled' => UserDisplayCurrency::dualCurrencyEnabled(),
            'supplierPkrDisplayEnabled' => UserDisplayCurrency::supplierPkrDisplayEnabled(),
            'supplier_pkr_display_enabled' => UserDisplayCurrency::supplierPkrDisplayEnabled(),
            'buyerPkrDisplayEnabled' => UserDisplayCurrency::buyerPkrDisplayEnabled(),
            'buyer_pkr_display_enabled' => UserDisplayCurrency::buyerPkrDisplayEnabled(),
            'ordersCount' => $this->when(isset($this->orders_count), fn () => (int) $this->orders_count),
            'orderValueTotal' => $this->when(isset($this->order_value_total), fn () => (float) ($this->order_value_total ?? 0)),
            'portfolioTotal' => $this->when(isset($this->portfolio_total), fn () => (float) ($this->portfolio_total ?? 0)),
        ];
    }
}
