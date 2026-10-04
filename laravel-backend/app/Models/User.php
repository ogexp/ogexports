<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'account_status',
        'last_seen_at',
        'email_verified_at',
        'two_factor_enabled',
        'two_factor_confirmed_at',
        'two_factor_code',
        'two_factor_code_expires_at',
        'two_factor_login_token',
        'transaction_password',
        'transaction_password_set_at',
        'withdraw_otp_code',
        'withdraw_otp_expires_at',
        'email_verification_code',
        'email_verification_expires_at',
        'password_reset_code',
        'password_reset_expires_at',
        'password_reset_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_code',
        'two_factor_login_token',
        'transaction_password',
        'withdraw_otp_code',
        'email_verification_code',
        'password_reset_code',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'email_verification_expires_at' => 'datetime',
            'password_reset_expires_at' => 'datetime',
            'password_reset_verified_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_enabled' => 'boolean',
            'two_factor_confirmed_at' => 'datetime',
            'two_factor_code_expires_at' => 'datetime',
            'transaction_password' => 'hashed',
            'transaction_password_set_at' => 'datetime',
            'withdraw_otp_expires_at' => 'datetime',
        ];
    }

    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class);
    }

    public function wallet(): HasOne
    {
        return $this->hasOne(Wallet::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'buyer_id');
    }

    public function rfqs(): HasMany
    {
        return $this->hasMany(Rfq::class, 'buyer_id');
    }

    public function supplierOffers(): HasMany
    {
        return $this->hasMany(SupplierOffer::class, 'supplier_id');
    }

    public function investments(): HasMany
    {
        return $this->hasMany(Investment::class, 'investor_id');
    }

    public function investorReports(): HasMany
    {
        return $this->hasMany(InvestorReport::class, 'investor_id');
    }

    public function deposits(): HasMany
    {
        return $this->hasMany(Deposit::class, 'investor_id');
    }

    public function withdrawals(): HasMany
    {
        return $this->hasMany(Withdrawal::class, 'investor_id');
    }

    public function kycApplications(): HasMany
    {
        return $this->hasMany(KycApplication::class);
    }

    public function latestKycApplication(): HasOne
    {
        return $this->hasOne(KycApplication::class)->latestOfMany();
    }

    public function latestInvestorKycApplication(): HasOne
    {
        return $this->hasOne(KycApplication::class)
            ->whereIn('type', ['investor', 'individual', 'company'])
            ->latestOfMany();
    }

    public function latestCompanyKycApplication(): HasOne
    {
        return $this->hasOne(KycApplication::class)
            ->where('type', 'company')
            ->latestOfMany();
    }

    public function latestSupplierKycApplication(): HasOne
    {
        return $this->hasOne(KycApplication::class)
            ->where('type', 'supplier')
            ->latestOfMany();
    }

    public function contactPersons(): HasMany
    {
        return $this->hasMany(ContactPerson::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(AppNotification::class);
    }

    public function supportTickets(): HasMany
    {
        return $this->hasMany(SupportTicket::class);
    }

    public function primaryRole(): ?string
    {
        return $this->getRoleNames()->first();
    }

    public function isActive(): bool
    {
        return $this->account_status === 'active';
    }

    public function isEmailVerified(): bool
    {
        return $this->email_verified_at !== null;
    }

    public function isPendingVerification(): bool
    {
        return $this->account_status === 'pending';
    }

    public function dashboardPath(): string
    {
        return match ($this->primaryRole()) {
            'admin' => '/admin/dashboard',
            'buyer' => '/buyer/dashboard',
            'supplier' => '/supplier/dashboard',
            'investor' => '/invest/dashboard',
            default => '/',
        };
    }
}
