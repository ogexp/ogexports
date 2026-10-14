<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Support\AuditsActions;
use App\Support\AuthFlowLogger;
use App\Support\InvestmentModule;
use App\Support\SupplierModule;
use App\Support\UserAgentParser;
use App\Services\AuthOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\PersonalAccessToken;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SecurityController extends Controller
{
    public function sessions(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = $user->id;
        $currentId = $request->hasSession() ? $request->session()->getId() : null;
        $currentToken = $user->currentAccessToken();
        $currentTokenId = $currentToken instanceof PersonalAccessToken
            ? (string) $currentToken->getKey()
            : null;

        $browserSessions = DB::table('sessions')
            ->where('user_id', $userId)
            ->orderByDesc('last_activity')
            ->limit(50)
            ->get()
            ->map(function ($row) use ($currentId) {
            $ua = (string) ($row->user_agent ?? '');

            return [
                'id' => $row->id,
                'session_type' => 'Browser',
                'ip' => $row->ip_address,
                'user_agent' => $ua,
                'device' => $this->parseDevice($ua),
                'last_activity' => $row->last_activity
                    ? date('c', (int) $row->last_activity)
                    : null,
                'last_activity_human' => $row->last_activity
                    ? \Carbon\Carbon::createFromTimestamp((int) $row->last_activity)->diffForHumans()
                    : null,
                'is_current' => $currentId && hash_equals((string) $currentId, (string) $row->id),
            ];
        });

        $mobileSessions = $user->tokens()
            ->orderByDesc('last_used_at')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(function (PersonalAccessToken $token) use ($currentTokenId) {
                $lastActivity = $token->last_used_at ?? $token->created_at;

                return [
                    'id' => 'mobile:'.$token->getKey(),
                    'session_type' => 'Mobile app',
                    'ip' => null,
                    'device' => $token->name ?: 'Mobile device',
                    'last_activity' => $lastActivity?->toIso8601String(),
                    'last_activity_human' => $lastActivity?->diffForHumans(),
                    'is_current' => $currentTokenId !== null
                        && hash_equals($currentTokenId, (string) $token->getKey()),
                ];
            });

        $data = $browserSessions->concat($mobileSessions)
            ->sortByDesc(fn (array $session) => $session['last_activity']
                ? strtotime($session['last_activity'])
                : 0)
            ->take(50)
            ->values();

        return response()->json(['data' => $data]);
    }

    public function destroySession(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (str_starts_with($id, 'mobile:')) {
            $tokenId = substr($id, strlen('mobile:'));
            abort_unless(ctype_digit($tokenId), 404, 'Session not found.');

            $currentToken = $user->currentAccessToken();
            if ($currentToken instanceof PersonalAccessToken
                && hash_equals((string) $currentToken->getKey(), $tokenId)) {
                throw ValidationException::withMessages([
                    'session' => ['Cannot revoke the current session. Use logout instead.'],
                ]);
            }

            $token = $user->tokens()->whereKey((int) $tokenId)->first();
            abort_if(! $token, 404, 'Session not found.');
            $token->delete();

            AuditsActions::log('session.revoked', 'security', $user, [
                'session_type' => 'mobile',
                'token_id' => (int) $tokenId,
            ]);

            return response()->json(['message' => 'Mobile session revoked.']);
        }

        $userId = $user->id;
        $currentId = $request->hasSession() ? $request->session()->getId() : null;

        if ($currentId && hash_equals((string) $currentId, $id)) {
            throw ValidationException::withMessages([
                'session' => ['Cannot revoke the current session. Use logout instead.'],
            ]);
        }

        $deleted = DB::table('sessions')
            ->where('user_id', $userId)
            ->where('id', $id)
            ->delete();

        if (! $deleted) {
            abort(404, 'Session not found.');
        }

        AuditsActions::log('session.revoked', 'security', $user, ['session_id' => $id]);

        return response()->json(['message' => 'Session revoked.']);
    }

    public function destroyOtherSessions(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = $user->id;
        $currentId = $request->hasSession() ? $request->session()->getId() : null;
        $currentToken = $user->currentAccessToken();
        $currentTokenId = $currentToken instanceof PersonalAccessToken
            ? (string) $currentToken->getKey()
            : null;

        $q = DB::table('sessions')->where('user_id', $userId);
        if ($currentId) {
            $q->where('id', '!=', $currentId);
        }
        $browserCount = $q->delete();

        $tokens = $user->tokens();
        if ($currentTokenId !== null) {
            $tokens->where('id', '!=', $currentTokenId);
        }
        $tokenCount = $tokens->delete();
        $count = $browserCount + $tokenCount;

        AuditsActions::log('session.revoked_others', 'security', $user, [
            'count' => $count,
            'browser_sessions' => $browserCount,
            'mobile_tokens' => $tokenCount,
        ]);

        return response()->json(['message' => 'Other sessions revoked.', 'count' => $count]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $logs = AuditLog::query()
            ->where('user_id', $request->user()->id)
            ->latest('created_at')
            ->limit(100)
            ->get()
            ->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'module' => $log->module,
                'ip' => $log->ip,
                'meta' => $log->meta,
                'created_at' => $log->created_at?->toIso8601String(),
                'time' => $log->created_at?->format('M j, Y — H:i'),
            ]);

        return response()->json(['data' => $logs]);
    }

    public function twoFactorStatus(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => [
                'enabled' => (bool) $user->two_factor_enabled,
                'confirmed_at' => $user->two_factor_confirmed_at?->toIso8601String(),
            ],
        ]);
    }

    public function twoFactorEnable(Request $request): JsonResponse
    {
        $data = $request->validate([
            'password' => ['required', 'string'],
        ]);

        /** @var User $user */
        $user = $request->user();

        if (! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Password is incorrect.'],
            ]);
        }

        $code = (string) random_int(100000, 999999);
        $user->forceFill([
            'two_factor_code' => Hash::make($code),
            'two_factor_code_expires_at' => now()->addMinutes(10),
        ])->save();

        $emailSent = $this->sendCodeEmail($user, $code, 'setup');

        AuthFlowLogger::logOtpGenerated(
            '2fa_enable',
            'enable',
            $user,
            $code,
            $emailSent,
            $user->id,
            10,
        );

        AuditsActions::log('2fa.enable_requested', 'security', $user);

        return response()->json([
            'message' => 'Verification code sent to your email.',
            'data' => ['email' => $this->maskEmail($user->email)],
        ]);
    }

    public function twoFactorConfirm(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        /** @var User $user */
        $user = $request->user();

        if (! $user->two_factor_code || ! $user->two_factor_code_expires_at || $user->two_factor_code_expires_at->isPast()) {
            throw ValidationException::withMessages([
                'code' => ['Code expired. Request a new one.'],
            ]);
        }

        if (! Hash::check($data['code'], $user->two_factor_code)) {
            throw ValidationException::withMessages([
                'code' => ['Invalid verification code.'],
            ]);
        }

        $user->forceFill([
            'two_factor_enabled' => true,
            'two_factor_confirmed_at' => now(),
            'two_factor_code' => null,
            'two_factor_code_expires_at' => null,
        ])->save();

        AuditsActions::log('2fa.enabled', 'security', $user);

        return response()->json(['message' => 'Two-factor authentication enabled.']);
    }

    public function twoFactorDisable(Request $request): JsonResponse
    {
        $data = $request->validate([
            'password' => ['required', 'string'],
        ]);

        /** @var User $user */
        $user = $request->user();

        if (! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Password is incorrect.'],
            ]);
        }

        $user->forceFill([
            'two_factor_enabled' => false,
            'two_factor_confirmed_at' => null,
            'two_factor_code' => null,
            'two_factor_code_expires_at' => null,
            'two_factor_login_token' => null,
        ])->save();

        AuditsActions::log('2fa.disabled', 'security', $user);

        return response()->json(['message' => 'Two-factor authentication disabled.']);
    }

    public function twoFactorVerifyLogin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = User::query()->where('two_factor_login_token', $data['token'])->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'code' => ['Invalid or expired login challenge.'],
            ]);
        }

        if (! $user->two_factor_code || ! $user->two_factor_code_expires_at || $user->two_factor_code_expires_at->isPast()) {
            throw ValidationException::withMessages([
                'code' => ['Code expired. Please log in again.'],
            ]);
        }

        if (! Hash::check($data['code'], $user->two_factor_code)) {
            throw ValidationException::withMessages([
                'code' => ['Invalid verification code.'],
            ]);
        }

        if ($user->hasRole('supplier') && ! SupplierModule::enabled()) {
            $user->forceFill([
                'two_factor_code' => null,
                'two_factor_code_expires_at' => null,
                'two_factor_login_token' => null,
            ])->save();

            throw ValidationException::withMessages([
                'code' => [SupplierModule::disabledMessage()],
            ]);
        }

        if ($user->hasRole('investor') && ! InvestmentModule::enabled()) {
            $user->forceFill([
                'two_factor_code' => null,
                'two_factor_code_expires_at' => null,
                'two_factor_login_token' => null,
            ])->save();

            throw ValidationException::withMessages([
                'code' => [InvestmentModule::disabledMessage()],
            ]);
        }

        $user->forceFill([
            'two_factor_code' => null,
            'two_factor_code_expires_at' => null,
            'two_factor_login_token' => null,
            'last_seen_at' => now(),
        ])->save();

        \Illuminate\Support\Facades\Auth::guard('web')->login($user, $request->boolean('remember'));
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        $userAgent = (string) $request->userAgent();
        AuditsActions::log('login.2fa_success', 'security', $user, [
            'user_agent' => $userAgent,
            'device' => UserAgentParser::parseDevice($userAgent),
        ]);

        return response()->json([
            'message' => 'Logged in successfully.',
            'user' => new \App\Http\Resources\UserResource($user->load(['profile', 'roles'])),
            'redirect' => $user->dashboardPath(),
        ]);
    }

    /**
     * Mobile 2FA verify — completes login challenge and returns a Sanctum token.
     */
    public function twoFactorVerifyLoginMobile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'code' => ['required', 'string', 'size:6'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ]);

        $user = User::query()->where('two_factor_login_token', $data['token'])->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'code' => ['Invalid or expired login challenge.'],
            ]);
        }

        if (! $user->two_factor_code || ! $user->two_factor_code_expires_at || $user->two_factor_code_expires_at->isPast()) {
            throw ValidationException::withMessages([
                'code' => ['Code expired. Please log in again.'],
            ]);
        }

        if (! Hash::check($data['code'], $user->two_factor_code)) {
            throw ValidationException::withMessages([
                'code' => ['Invalid verification code.'],
            ]);
        }

        if ($user->hasRole('supplier') && ! SupplierModule::enabled()) {
            $user->forceFill([
                'two_factor_code' => null,
                'two_factor_code_expires_at' => null,
                'two_factor_login_token' => null,
            ])->save();

            throw ValidationException::withMessages([
                'code' => [SupplierModule::disabledMessage()],
            ]);
        }

        if ($user->hasRole('investor') && ! InvestmentModule::enabled()) {
            $user->forceFill([
                'two_factor_code' => null,
                'two_factor_code_expires_at' => null,
                'two_factor_login_token' => null,
            ])->save();

            throw ValidationException::withMessages([
                'code' => [InvestmentModule::disabledMessage()],
            ]);
        }

        $user->forceFill([
            'two_factor_code' => null,
            'two_factor_code_expires_at' => null,
            'two_factor_login_token' => null,
            'last_seen_at' => now(),
        ])->save();

        $deviceName = $data['device_name'] ?? 'mobile';
        $plainToken = $user->createToken($deviceName)->plainTextToken;

        $userAgent = (string) $request->userAgent();
        AuditsActions::log('login.2fa_success', 'security', $user, [
            'user_agent' => $userAgent,
            'device' => UserAgentParser::parseDevice($userAgent),
            'channel' => 'mobile',
        ]);

        return response()->json([
            'message' => 'Logged in successfully.',
            'user' => new \App\Http\Resources\UserResource($user->load(['profile', 'roles'])),
            'token' => $plainToken,
            'token_type' => 'Bearer',
            'redirect' => $user->dashboardPath(),
        ]);
    }

    public function twoFactorResend(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
        ]);

        $user = User::query()->where('two_factor_login_token', $data['token'])->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'token' => ['Invalid or expired login challenge. Please sign in again.'],
            ]);
        }

        $resendKey = 'otp_resend:2fa_login:'.$user->id;
        if (\Illuminate\Support\Facades\Cache::has($resendKey)) {
            $seconds = \Illuminate\Support\Facades\Cache::get($resendKey);
            throw ValidationException::withMessages([
                'token' => ["Please wait {$seconds} seconds before requesting a new code."],
            ]);
        }

        $code = AuthOtpService::generateOtpCode();
        $user->forceFill([
            'two_factor_code' => Hash::make($code),
            'two_factor_code_expires_at' => now()->addMinutes(10),
        ])->save();

        $emailSent = $this->sendCodeEmail($user, $code);

        AuthFlowLogger::logOtpGenerated(
            '2fa_login',
            'resend',
            $user,
            $code,
            $emailSent,
            $user->id,
            10,
        );

        AuthFlowLogger::info('auth.2fa.resend', [
            'email' => $user->email,
            'user_id' => $user->id,
            'email_sent' => $emailSent,
        ]);

        \Illuminate\Support\Facades\Cache::put(
            $resendKey,
            AuthOtpService::RESEND_COOLDOWN_SECONDS,
            now()->addSeconds(AuthOtpService::RESEND_COOLDOWN_SECONDS),
        );

        return response()->json(array_merge([
            'message' => 'A new verification code has been sent to your email.',
            'email' => $this->maskEmail($user->email),
        ], AuthOtpService::devOtpResponse()));
    }

    private function sendCodeEmail(User $user, string $code, string $purpose = 'login'): bool
    {
        $isSetup = $purpose === 'setup';
        $subject = $isSetup
            ? 'OG Exports | Confirm your sign-in security'
            : 'OG Exports | Your sign-in code';
        $heading = $isSetup
            ? 'Confirm two-factor authentication'
            : 'Verify your sign-in';
        $action = $isSetup
            ? 'Use this secure, one-time code to finish enabling email two-factor authentication for your OG Exports investor account.'
            : 'Use this secure, one-time code to finish signing in to your OG Exports investor account.';
        $firstName = trim(explode(' ', trim((string) $user->name))[0] ?? '') ?: 'Investor';
        $safeCode = e($code);
        $safeFirstName = e($firstName);
        $bodyText = "OG EXPORTS | INVESTOR ACCOUNT SECURITY\n\n{$heading}\n\nHello {$firstName},\n\n{$action}\n\n{$code}\n\nThis code expires in 10 minutes. Never share it with anyone. OG Exports will never ask you to disclose it.\n\n".($isSetup
            ? 'If you did not request this change, ignore this email. Your security settings will not change without this code.'
            : 'If you did not request this code, you can safely ignore this email. No sign-in will be completed without it.')."\n\nThis is an automated security email from OG Exports. Please do not reply.";
        $htmlTemplate = <<<'HTML'
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f3f7f5;font-family:Arial,Helvetica,sans-serif;color:#19372f">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">Your secure OG Exports code expires in 10 minutes.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f7f5;padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e3ebe7;border-radius:16px;overflow:hidden">
          <tr><td style="background:#12392f;padding:25px 32px">
            <div style="font-size:20px;line-height:26px;font-weight:700;letter-spacing:1.2px;color:#ffffff">OG EXPORTS</div>
            <div style="margin-top:5px;font-size:11px;line-height:16px;letter-spacing:1.6px;color:#b8d6c8">INVESTOR ACCOUNT SECURITY</div>
          </td></tr>
          <tr><td style="padding:34px 32px 12px">
            <div style="font-size:24px;line-height:32px;font-weight:700;color:#17352e">{{heading}}</div>
            <p style="margin:16px 0 22px;font-size:15px;line-height:24px;color:#52645d">Hello {{first_name}},</p>
            <p style="margin:0 0 22px;font-size:15px;line-height:24px;color:#52645d">{{action}}</p>
            <div style="margin:0 0 14px;padding:19px 12px;text-align:center;background:#f4f8f6;border:1px solid #dce9e2;border-radius:12px">
              <div style="font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.5px;color:#527064">YOUR VERIFICATION CODE</div>
              <div style="padding-top:8px;font-family:Arial,Helvetica,sans-serif;font-size:34px;line-height:42px;font-weight:700;letter-spacing:9px;color:#087f5b">{{code}}</div>
            </div>
            <p style="margin:0 0 24px;text-align:center;font-size:13px;line-height:20px;color:#687a72">This code expires in <strong style="color:#334b41">10 minutes</strong>.</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff8e9;border-left:3px solid #d7a94b;border-radius:4px">
              <tr><td style="padding:13px 15px;font-size:13px;line-height:20px;color:#675633"><strong>Keep your account secure.</strong> Never share this code with anyone. OG Exports will never ask you to disclose it.</td></tr>
            </table>
            <p style="margin:22px 0 0;font-size:13px;line-height:21px;color:#687a72">{{ignore_notice}}</p>
          </td></tr>
          <tr><td style="padding:20px 32px;border-top:1px solid #edf1ee;font-size:11px;line-height:18px;color:#87958e">This is an automated security email from OG Exports. Please do not reply.</td></tr>
        </table>
        <div style="padding:16px 8px 0;font-size:11px;line-height:17px;color:#87958e">OG Exports · Investor Services</div>
      </td></tr>
    </table>
  </body>
</html>
HTML;
        $html = strtr($htmlTemplate, [
            '{{heading}}' => e($heading),
            '{{first_name}}' => $safeFirstName,
            '{{action}}' => e($action),
            '{{code}}' => $safeCode,
            '{{ignore_notice}}' => e($isSetup
                ? 'If you did not request this change, ignore this email. Your security settings will not change without this code.'
                : 'If you did not request this code, you can safely ignore this email. No sign-in will be completed without it.'),
        ]);

        try {
            Mail::send([], [], function ($message) use ($user, $subject, $html, $bodyText) {
                    $message->to($user->email)
                        ->subject($subject)
                        ->html($html)
                        ->text($bodyText);
            });

            AuthFlowLogger::info('auth.2fa.email_sent', [
                'email' => $user->email,
                'user_id' => $user->id,
            ]);

            return true;
        } catch (\Throwable $e) {
            report($e);

            AuthFlowLogger::error('auth.2fa.email_failed', [
                'email' => $user->email,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $visible = substr($local, 0, 2);

        return $visible.str_repeat('*', max(strlen($local) - 2, 1)).'@'.$domain;
    }

    private function parseDevice(string $ua): string
    {
        return UserAgentParser::parseDevice($ua);
    }

    public static function beginLoginChallenge(User $user): array
    {
        $code = AuthOtpService::generateOtpCode();
        $token = Str::random(40);

        $user->forceFill([
            'two_factor_code' => Hash::make($code),
            'two_factor_code_expires_at' => now()->addMinutes(10),
            'two_factor_login_token' => $token,
        ])->save();

        $ctrl = new self;
        $emailSent = $ctrl->sendCodeEmail($user, $code);

        AuthFlowLogger::logOtpGenerated(
            '2fa_login',
            'login',
            $user,
            $code,
            $emailSent,
            $user->id,
            10,
        );

        AuthFlowLogger::info('auth.2fa.challenge_started', [
            'email' => $user->email,
            'user_id' => $user->id,
            'context' => 'login',
            'email_sent' => $emailSent,
        ]);

        return array_merge([
            'requires_2fa' => true,
            'token' => $token,
            'email' => $ctrl->maskEmail($user->email),
            'message' => 'Enter the verification code sent to your email.',
        ], AuthOtpService::devOtpResponse());
    }

    public function transactionPasswordStatus(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => [
                'set' => filled($user->transaction_password),
                'set_at' => $user->transaction_password_set_at?->toIso8601String(),
            ],
        ]);
    }

    public function transactionPasswordSet(Request $request): JsonResponse
    {
        $data = $request->validate([
            'password' => ['required', 'string'],
            'transaction_password' => ['required', 'string', 'min:6', 'max:100'],
            'transaction_password_confirmation' => ['required', 'same:transaction_password'],
        ]);

        /** @var User $user */
        $user = $request->user();

        if (! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Login password is incorrect.'],
            ]);
        }

        $user->forceFill([
            'transaction_password' => $data['transaction_password'],
            'transaction_password_set_at' => now(),
        ])->save();

        AuditsActions::log('transaction_password.set', 'security', $user);

        return response()->json(['message' => 'Transaction password set successfully.']);
    }

    public function transactionPasswordReset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'password' => ['required', 'string'],
            'transaction_password' => ['required', 'string', 'min:6', 'max:100'],
            'transaction_password_confirmation' => ['required', 'same:transaction_password'],
        ]);

        /** @var User $user */
        $user = $request->user();

        if (! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Login password is incorrect.'],
            ]);
        }

        $user->forceFill([
            'transaction_password' => $data['transaction_password'],
            'transaction_password_set_at' => now(),
        ])->save();

        AuditsActions::log('transaction_password.reset', 'security', $user);

        return response()->json(['message' => 'Transaction password updated successfully.']);
    }

    public static function verifyTransactionPassword(User $user, string $password): void
    {
        if (! filled($user->transaction_password)) {
            throw ValidationException::withMessages([
                'transaction_password' => ['Transaction password is not set. Please set it in Settings before withdrawing.'],
            ]);
        }

        if (! Hash::check($password, $user->transaction_password)) {
            throw ValidationException::withMessages([
                'transaction_password' => ['Transaction password is incorrect.'],
            ]);
        }
    }
}
