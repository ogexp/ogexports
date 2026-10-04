<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuthOtpService;
use App\Support\ExchangeRateService;
use App\Support\InvestmentModule;
use App\Support\InvestorBankAccounts;
use App\Support\UserDisplayCurrency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MobileAppController extends Controller
{
    /**
     * Public (and optionally authenticated) bootstrap payload for the Flutter investor app.
     * Send Authorization: Bearer when logged in to receive user-specific fields.
     */
    public function bootstrap(Request $request): JsonResponse
    {
        $payload = [
            'app' => 'OG Exports Investor',
            'api_version' => 'v1',
            'investment_module_enabled' => InvestmentModule::enabled(),
            'supported_currencies' => ExchangeRateService::supportedCurrencies(),
            'auth' => [
                'token_type' => 'Bearer',
                'login' => '/api/auth/mobile/login',
                'verify_email' => '/api/auth/mobile/verify-email',
                'two_factor' => '/api/auth/mobile/2fa/verify',
                'logout' => '/api/auth/mobile/logout',
                'aliases' => [
                    'login' => '/api/mobile/v1/auth/login',
                    'verify_email' => '/api/mobile/v1/auth/verify-email',
                    'two_factor' => '/api/mobile/v1/auth/2fa/verify',
                    'logout' => '/api/mobile/v1/auth/logout',
                ],
            ],
        ];

        if (config('app.debug')) {
            $payload['dev'] = array_merge([
                'hint' => 'When APP_DEBUG=true, OTP responses may include dev_otp.',
            ], AuthOtpService::devOtpResponse());
        }

        /** @var User|null $user */
        $user = $request->user() ?? Auth::guard('sanctum')->user();

        if ($user instanceof User) {
            $user->loadMissing(['profile', 'wallet', 'roles']);
            $meta = is_array($user->profile?->meta) ? $user->profile->meta : [];
            $accounts = InvestorBankAccounts::normalizeFromMeta($meta);
            $defaultBank = InvestorBankAccounts::defaultAccount($accounts);

            $payload['user'] = [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->roles->first()?->name,
                'default_currency' => UserDisplayCurrency::currencyForUser($user),
                'has_default_bank_account' => $defaultBank !== null,
            ];
        }

        return response()->json(['data' => $payload]);
    }
}
