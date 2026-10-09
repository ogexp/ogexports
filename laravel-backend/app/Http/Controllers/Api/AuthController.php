<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Wallet;
use App\Services\AuthOtpService;
use App\Support\AuthFlowLogger;
use App\Support\InvestmentModule;
use App\Support\AdminNotificationTypes;
use App\Support\NotifiesAdmins;
use App\Support\SupplierModule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuthOtpService $otp,
    ) {}

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
            'phone' => ['nullable', 'string', 'max:50'],
            'account_type' => ['required', Rule::in(['buyer', 'supplier', 'investor'])],
            'company_name' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:100'],
        ]);

        if ($data['account_type'] === 'supplier' && ! SupplierModule::enabled()) {
            throw ValidationException::withMessages([
                'account_type' => [SupplierModule::disabledMessage()],
            ]);
        }

        if ($data['account_type'] === 'investor' && ! InvestmentModule::enabled()) {
            throw ValidationException::withMessages([
                'account_type' => [InvestmentModule::disabledMessage()],
            ]);
        }

        AuthFlowLogger::info('auth.register.started', [
            'email' => $data['email'],
            'account_type' => $data['account_type'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => $data['password'],
            'account_status' => 'pending',
            'email_verified_at' => null,
        ]);

        $user->assignRole($data['account_type']);

        UserProfile::create([
            'user_id' => $user->id,
            'company_name' => $data['company_name'] ?? null,
            'country' => $data['country'] ?? null,
            'meta' => $data['account_type'] === 'investor'
                ? ['preferences' => ['currency' => 'USD']]
                : [],
        ]);

        if ($data['account_type'] === 'investor') {
            Wallet::create([
                'user_id' => $user->id,
                'currency' => 'USD',
            ]);
        }

        $otpSent = $this->otp->sendRegistrationOtp($user, 'register');

        AuthFlowLogger::info('auth.register.completed', [
            'email' => $user->email,
            'user_id' => $user->id,
            'account_type' => $data['account_type'],
            'otp_sent' => $otpSent,
        ]);

        return response()->json(array_merge([
            'message' => 'Account created. Please verify your email with the code we sent.',
            'requires_verification' => true,
            'email' => $user->email,
            'masked_email' => AuthOtpService::maskEmail($user->email),
        ], AuthOtpService::devOtpResponse()), 201);
    }

    public function verifyEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = User::query()->where('email', $data['email'])->first();

        if (! $user) {
            AuthFlowLogger::warning('auth.register.verify_failed', [
                'email' => $data['email'],
                'reason' => 'user_not_found',
            ]);

            throw ValidationException::withMessages([
                'email' => ['No account found with this email address.'],
            ]);
        }

        if ($user->isEmailVerified() && $user->isActive()) {
            throw ValidationException::withMessages([
                'email' => ['This email is already verified. You can sign in.'],
            ]);
        }

        $this->otp->verifyRegistrationOtp($user, $data['code']);

        $user->forceFill([
            'email_verified_at' => now(),
            'account_status' => 'active',
        ])->save();

        $this->otp->clearRegistrationOtp($user);

        Auth::guard('web')->login($user);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        $userAgent = (string) $request->userAgent();
        \App\Support\AuditsActions::log('email.verified', 'security', $user, [
            'user_agent' => $userAgent,
            'device' => \App\Support\UserAgentParser::parseDevice($userAgent),
        ]);

        AuthFlowLogger::info('auth.register.verified', [
            'email' => $user->email,
            'user_id' => $user->id,
        ]);

        $role = $user->getRoleNames()->first() ?? 'user';
        NotifiesAdmins::notify(
            AdminNotificationTypes::USER_REGISTERED,
            'New '.ucfirst((string) $role).' registered: '.$user->name,
            $user->email.' just verified their account.',
            ['href' => '/admin/users', 'user_id' => $user->id, 'role' => $role]
        );

        return response()->json([
            'message' => 'Email verified successfully.',
            'user' => new UserResource($user->load(['profile', 'roles'])),
            'redirect' => $user->dashboardPath(),
        ]);
    }

    public function resendVerification(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::query()->where('email', $data['email'])->first();

        if (! $user) {
            AuthFlowLogger::info('auth.register.resend', [
                'email' => $data['email'],
                'user_found' => false,
            ]);

            return response()->json([
                'message' => 'If an account exists for this email, a verification code has been sent.',
            ]);
        }

        if ($user->isEmailVerified() && $user->isActive()) {
            throw ValidationException::withMessages([
                'email' => ['This email is already verified. You can sign in.'],
            ]);
        }

        $otpSent = $this->otp->sendRegistrationOtp($user, 'resend');

        AuthFlowLogger::info('auth.register.resend', [
            'email' => $user->email,
            'user_id' => $user->id,
            'user_found' => true,
            'otp_sent' => $otpSent,
        ]);

        return response()->json(array_merge([
            'message' => 'Verification code sent.',
            'masked_email' => AuthOtpService::maskEmail($user->email),
        ], AuthOtpService::devOtpResponse()));
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $attemptOk = false;
        try {
            $attemptOk = Auth::attempt($credentials, $request->boolean('remember'));
        } catch (\RuntimeException) {
            AuthFlowLogger::warning('auth.login.failed', [
                'email' => $credentials['email'],
                'reason' => 'invalid_password_hash',
            ]);

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (! $attemptOk) {
            AuthFlowLogger::warning('auth.login.failed', [
                'email' => $credentials['email'],
            ]);

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        /** @var User $user */
        $user = Auth::user();

        if ($user->account_status === 'suspended') {
            Auth::logout();

            AuthFlowLogger::warning('auth.login.blocked', [
                'email' => $user->email,
                'user_id' => $user->id,
                'reason' => 'suspended',
            ]);

            throw ValidationException::withMessages([
                'email' => ['Your account is suspended. Contact support.'],
            ]);
        }

        if ($user->isPendingVerification()) {
            Auth::logout();
            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            AuthFlowLogger::info('auth.login.pending_verification', [
                'email' => $user->email,
                'user_id' => $user->id,
            ]);

            return response()->json(array_merge([
                'requires_verification' => true,
                'email' => $user->email,
                'masked_email' => AuthOtpService::maskEmail($user->email),
                'message' => 'Please verify your email before signing in.',
            ], AuthOtpService::devOtpResponse()), 403);
        }

        if (! $user->isActive()) {
            Auth::logout();

            AuthFlowLogger::warning('auth.login.blocked', [
                'email' => $user->email,
                'user_id' => $user->id,
                'reason' => 'inactive',
            ]);

            throw ValidationException::withMessages([
                'email' => ['Your account is not active. Contact support.'],
            ]);
        }

        if ($user->hasRole('supplier') && ! SupplierModule::enabled()) {
            Auth::logout();
            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            AuthFlowLogger::warning('auth.login.blocked', [
                'email' => $user->email,
                'user_id' => $user->id,
                'reason' => 'supplier_module_disabled',
            ]);

            throw ValidationException::withMessages([
                'email' => [SupplierModule::disabledMessage()],
            ]);
        }

        if ($user->hasRole('investor') && ! InvestmentModule::enabled()) {
            Auth::logout();
            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            AuthFlowLogger::warning('auth.login.blocked', [
                'email' => $user->email,
                'user_id' => $user->id,
                'reason' => 'investor_module_disabled',
            ]);

            throw ValidationException::withMessages([
                'email' => [InvestmentModule::disabledMessage()],
            ]);
        }

        $isAdmin = $user->hasRole('admin');
        $adminOtpRequired = $isAdmin
            && (bool) (PlatformSetting::query()->value('admin_otp_enabled') ?? false);
        $requiresOtp = $adminOtpRequired || (! $isAdmin && $user->two_factor_enabled);

        if ($requiresOtp) {
            Auth::logout();
            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            AuthFlowLogger::info('auth.login.2fa_required', [
                'email' => $user->email,
                'user_id' => $user->id,
                'reason' => $adminOtpRequired ? 'admin_otp_enabled' : 'user_two_factor',
            ]);

            return response()->json(
                SecurityController::beginLoginChallenge($user)
            );
        }

        $user->forceFill(['last_seen_at' => now()])->save();
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        $userAgent = (string) $request->userAgent();
        \App\Support\AuditsActions::log('login.success', 'security', $user, [
            'user_agent' => $userAgent,
            'device' => \App\Support\UserAgentParser::parseDevice($userAgent),
        ]);

        AuthFlowLogger::info('auth.login.success', [
            'email' => $user->email,
            'user_id' => $user->id,
            'role' => $user->roles->first()?->name,
        ]);

        return response()->json([
            'message' => 'Logged in successfully.',
            'user' => new UserResource($user->load(['profile', 'roles'])),
            'redirect' => $user->dashboardPath(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        if ($request->session()->has('impersonator_id')) {
            return $this->stopImpersonating($request);
        }

        Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Logged out successfully.']);
    }

    /**
     * Mobile (Flutter) login — returns a Sanctum personal access token.
     * Does not rely on session cookies / CSRF.
     */
    public function mobileLogin(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ]);

        $user = User::query()->where('email', $credentials['email'])->first();

        $passwordOk = false;
        if ($user) {
            try {
                $passwordOk = Hash::check($credentials['password'], $user->password);
            } catch (\RuntimeException) {
                $passwordOk = false;
            }
        }

        if (! $user || ! $passwordOk) {
            AuthFlowLogger::warning('auth.mobile.login.failed', [
                'email' => $credentials['email'],
            ]);

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->account_status === 'suspended') {
            AuthFlowLogger::warning('auth.mobile.login.blocked', [
                'email' => $user->email,
                'user_id' => $user->id,
                'reason' => 'suspended',
            ]);

            throw ValidationException::withMessages([
                'email' => ['Your account is suspended. Contact support.'],
            ]);
        }

        if ($user->isPendingVerification()) {
            AuthFlowLogger::info('auth.mobile.login.pending_verification', [
                'email' => $user->email,
                'user_id' => $user->id,
            ]);

            return response()->json(array_merge([
                'requires_verification' => true,
                'email' => $user->email,
                'masked_email' => AuthOtpService::maskEmail($user->email),
                'message' => 'Please verify your email before signing in.',
            ], AuthOtpService::devOtpResponse()), 403);
        }

        if (! $user->isActive()) {
            AuthFlowLogger::warning('auth.mobile.login.blocked', [
                'email' => $user->email,
                'user_id' => $user->id,
                'reason' => 'inactive',
            ]);

            throw ValidationException::withMessages([
                'email' => ['Your account is not active. Contact support.'],
            ]);
        }

        if ($user->hasRole('supplier') && ! SupplierModule::enabled()) {
            throw ValidationException::withMessages([
                'email' => [SupplierModule::disabledMessage()],
            ]);
        }

        if ($user->hasRole('investor') && ! InvestmentModule::enabled()) {
            throw ValidationException::withMessages([
                'email' => [InvestmentModule::disabledMessage()],
            ]);
        }

        $isAdmin = $user->hasRole('admin');
        $adminOtpRequired = $isAdmin
            && (bool) (PlatformSetting::query()->value('admin_otp_enabled') ?? false);
        $requiresOtp = $adminOtpRequired || (! $isAdmin && $user->two_factor_enabled);

        if ($requiresOtp) {
            AuthFlowLogger::info('auth.mobile.login.2fa_required', [
                'email' => $user->email,
                'user_id' => $user->id,
            ]);

            return response()->json(
                SecurityController::beginLoginChallenge($user)
            );
        }

        $user->forceFill(['last_seen_at' => now()])->save();

        $deviceName = $credentials['device_name'] ?? 'mobile';
        $plainToken = $this->issueMobileToken($user, $deviceName);

        AuthFlowLogger::info('auth.mobile.login.success', [
            'email' => $user->email,
            'user_id' => $user->id,
            'role' => $user->roles->first()?->name,
        ]);
        \App\Support\AuditsActions::log('login.mobile_success', 'security', $user, [
            'channel' => 'mobile',
            'device' => $deviceName,
            'user_agent' => (string) $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Logged in successfully.',
            'user' => new UserResource($user->load(['profile', 'roles'])),
            'token' => $plainToken,
            'token_type' => 'Bearer',
            'redirect' => $user->dashboardPath(),
        ]);
    }

    /**
     * Mobile email verification — verifies OTP and returns a Sanctum token.
     */
    public function mobileVerifyEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'size:6'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ]);

        $user = User::query()->where('email', $data['email'])->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['No account found with this email address.'],
            ]);
        }

        if ($user->isEmailVerified() && $user->isActive()) {
            throw ValidationException::withMessages([
                'email' => ['This email is already verified. You can sign in.'],
            ]);
        }

        $this->otp->verifyRegistrationOtp($user, $data['code']);

        $user->forceFill([
            'email_verified_at' => now(),
            'account_status' => 'active',
        ])->save();

        $this->otp->clearRegistrationOtp($user);

        $role = $user->getRoleNames()->first() ?? 'user';
        NotifiesAdmins::notify(
            AdminNotificationTypes::USER_REGISTERED,
            'New '.ucfirst((string) $role).' registered: '.$user->name,
            $user->email.' just verified their account.',
            ['href' => '/admin/users', 'user_id' => $user->id, 'role' => $role]
        );

        $deviceName = $data['device_name'] ?? 'mobile';
        $plainToken = $this->issueMobileToken($user, $deviceName);

        AuthFlowLogger::info('auth.mobile.register.verified', [
            'email' => $user->email,
            'user_id' => $user->id,
        ]);

        return response()->json([
            'message' => 'Email verified successfully.',
            'user' => new UserResource($user->load(['profile', 'roles'])),
            'token' => $plainToken,
            'token_type' => 'Bearer',
            'redirect' => $user->dashboardPath(),
        ]);
    }

    /**
     * Revoke the current Sanctum personal access token (mobile logout).
     */
    public function mobileLogout(Request $request): JsonResponse
    {
        $user = $request->user();
        $token = $user?->currentAccessToken();

        if ($token) {
            \App\Support\AuditsActions::log('logout.mobile', 'security', $user);
            $token->delete();
        }

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function issueMobileToken(User $user, string $deviceName = 'mobile'): string
    {
        return $user->createToken($deviceName)->plainTextToken;
    }

    public function stopImpersonating(Request $request): JsonResponse
    {
        $impersonatorId = $request->session()->get('impersonator_id');

        if (! $impersonatorId) {
            return response()->json(['message' => 'Not impersonating.'], 403);
        }

        /** @var User|null $admin */
        $admin = User::query()->with(['profile', 'roles'])->find($impersonatorId);

        if (! $admin || ! $admin->hasRole('admin')) {
            $request->session()->forget('impersonator_id');
            Auth::guard('web')->logout();
            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            return response()->json(['message' => 'Impersonation session cleared.'], 403);
        }

        $request->session()->forget('impersonator_id');
        Auth::guard('web')->login($admin);

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        \App\Support\AuditsActions::log('user.impersonation.stopped', 'users', $admin);

        return response()->json([
            'message' => 'Returned to admin panel.',
            'user' => new UserResource($admin),
            'redirect' => $admin->dashboardPath(),
            'impersonating' => false,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['profile', 'roles']);
        $payload = (new UserResource($user))->resolve($request);

        $impersonatorId = $request->hasSession()
            ? $request->session()->get('impersonator_id')
            : null;

        if ($impersonatorId) {
            $admin = User::query()->find($impersonatorId);
            $payload['impersonating'] = true;
            $payload['impersonator'] = $admin ? [
                'id' => (string) $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
            ] : null;
        } else {
            $payload['impersonating'] = false;
        }

        return response()->json($payload);
    }

    public function updateProfile(Request $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:500'],
            'avatar_url' => ['nullable', 'string', 'max:1000'],
            'meta' => ['nullable', 'array'],
            'account_status' => ['sometimes', 'string', 'in:active,suspended,pending'],
        ]);

        $userFill = collect($data)->only(['name', 'phone'])->all();
        if (array_key_exists('account_status', $data)) {
            $userFill['account_status'] = $data['account_status'];
        }
        if ($userFill !== []) {
            $user->fill($userFill)->save();
        }

        $profileData = collect($data)->only([
            'company_name', 'country', 'city', 'address', 'avatar_url',
        ])->all();

        if (array_key_exists('meta', $data)) {
            $existing = $user->profile?->meta ?? [];
            if (! is_array($existing)) {
                $existing = [];
            }
            $profileData['meta'] = array_replace_recursive($existing, $data['meta'] ?? []);
        }

        if ($profileData !== []) {
            $user->profile()->updateOrCreate(['user_id' => $user->id], $profileData);
        }

        return new UserResource($user->fresh()->load(['profile', 'roles', 'latestKycApplication']));
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        /** @var User $user */
        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->update(['password' => $data['password']]);

        \App\Support\AuditsActions::log('password.changed', 'security', $user);

        return response()->json(['message' => 'Password updated successfully.']);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::query()->where('email', $data['email'])->first();

        if ($user) {
            $this->otp->sendPasswordResetOtp($user, 'forgot_password');
        }

        return response()->json(array_merge([
            'message' => 'If an account exists for this email, a reset code has been sent.',
            'success' => true,
        ], $user ? AuthOtpService::devOtpResponse() : []));
    }

    public function verifyResetOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = User::query()->where('email', $data['email'])->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'code' => ['Invalid or expired reset code.'],
            ]);
        }

        $this->otp->verifyPasswordResetOtp($user, $data['code']);

        return response()->json([
            'message' => 'Reset code verified. You may set a new password.',
            'success' => true,
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $user = User::query()->where('email', $data['email'])->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['Unable to reset password for this account.'],
            ]);
        }

        $this->otp->ensurePasswordResetVerified($user);

        $user->forceFill(['password' => $data['password']])->save();
        $this->otp->clearPasswordResetState($user);

        \App\Support\AuditsActions::log('password.reset', 'security', $user);

        return response()->json(['message' => 'Password reset successfully.', 'success' => true]);
    }
}
