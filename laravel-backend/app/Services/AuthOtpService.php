<?php

namespace App\Services;

use App\Models\User;
use App\Support\AuthFlowLogger;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthOtpService
{
    public const DEV_OTP_CODE = '888777';

    public const MAX_ATTEMPTS = 5;

    public const RESEND_COOLDOWN_SECONDS = 60;

    public const REGISTRATION_TTL_MINUTES = 10;

    public const PASSWORD_RESET_TTL_MINUTES = 10;

    public const RESET_VERIFIED_TTL_MINUTES = 15;

    public function sendRegistrationOtp(User $user, string $trigger = 'register'): bool
    {
        $this->enforceResendCooldown('registration', $user->email);

        $code = $this->generateCode();
        $user->forceFill([
            'email_verification_code' => Hash::make($code),
            'email_verification_expires_at' => now()->addMinutes(self::REGISTRATION_TTL_MINUTES),
        ])->save();

        $this->clearAttempts('registration', $user->email);
        $this->markResent('registration', $user->email);

        $sent = NotificationMailer::sendTemplated($user, 'registration_otp', [
            'otp_code' => $code,
            'expires_minutes' => self::REGISTRATION_TTL_MINUTES,
        ]);

        if ($sent) {
            AuthFlowLogger::info('auth.registration.otp_sent', [
                'email' => $user->email,
                'user_id' => $user->id,
                'trigger' => $trigger,
            ]);
        } else {
            AuthFlowLogger::warning('auth.registration.otp_failed', [
                'email' => $user->email,
                'user_id' => $user->id,
                'trigger' => $trigger,
            ]);
        }

        AuthFlowLogger::logOtpGenerated(
            'registration',
            $trigger,
            $user,
            $code,
            $sent,
            $user->id,
            self::REGISTRATION_TTL_MINUTES,
        );

        return $sent;
    }

    public function verifyRegistrationOtp(User $user, string $code): void
    {
        $this->verifyStoredCode(
            $user,
            'registration',
            $user->email,
            $user->email_verification_code,
            $user->email_verification_expires_at,
            $code,
            'code',
            'Verification code expired. Request a new one.',
        );
    }

    public function sendPasswordResetOtp(User $user, string $trigger = 'forgot_password'): bool
    {
        $this->enforceResendCooldown('password_reset', $user->email);

        $code = $this->generateCode();
        $user->forceFill([
            'password_reset_code' => Hash::make($code),
            'password_reset_expires_at' => now()->addMinutes(self::PASSWORD_RESET_TTL_MINUTES),
            'password_reset_verified_at' => null,
        ])->save();

        $this->clearAttempts('password_reset', $user->email);
        $this->markResent('password_reset', $user->email);

        $sent = NotificationMailer::sendTemplated($user, 'password_reset_otp', [
            'otp_code' => $code,
            'expires_minutes' => self::PASSWORD_RESET_TTL_MINUTES,
        ]);

        if ($sent) {
            AuthFlowLogger::info('auth.password_reset.otp_sent', [
                'email' => $user->email,
                'user_id' => $user->id,
                'trigger' => $trigger,
            ]);
        } else {
            AuthFlowLogger::warning('auth.password_reset.otp_failed', [
                'email' => $user->email,
                'user_id' => $user->id,
                'trigger' => $trigger,
            ]);
        }

        AuthFlowLogger::logOtpGenerated(
            'password_reset',
            $trigger,
            $user,
            $code,
            $sent,
            $user->id,
            self::PASSWORD_RESET_TTL_MINUTES,
        );

        return $sent;
    }

    public function verifyPasswordResetOtp(User $user, string $code): void
    {
        $this->verifyStoredCode(
            $user,
            'password_reset',
            $user->email,
            $user->password_reset_code,
            $user->password_reset_expires_at,
            $code,
            'code',
            'Reset code expired. Request a new one.',
        );

        $user->forceFill([
            'password_reset_code' => null,
            'password_reset_expires_at' => null,
            'password_reset_verified_at' => now(),
        ])->save();
    }

    public function ensurePasswordResetVerified(User $user): void
    {
        if (! $user->password_reset_verified_at) {
            throw ValidationException::withMessages([
                'email' => ['Password reset not verified. Complete OTP verification first.'],
            ]);
        }

        if ($user->password_reset_verified_at->lt(now()->subMinutes(self::RESET_VERIFIED_TTL_MINUTES))) {
            $user->forceFill(['password_reset_verified_at' => null])->save();

            throw ValidationException::withMessages([
                'email' => ['Reset session expired. Please start again.'],
            ]);
        }
    }

    public function clearPasswordResetState(User $user): void
    {
        $user->forceFill([
            'password_reset_code' => null,
            'password_reset_expires_at' => null,
            'password_reset_verified_at' => null,
        ])->save();
    }

    public function clearRegistrationOtp(User $user): void
    {
        $user->forceFill([
            'email_verification_code' => null,
            'email_verification_expires_at' => null,
        ])->save();
    }

    public static function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $visible = substr($local, 0, 2);

        return $visible.str_repeat('*', max(strlen($local) - 2, 1)).'@'.$domain;
    }

    public static function devCode(): ?string
    {
        if (! config('app.debug')) {
            return null;
        }

        return config('auth.otp_dev_code', self::DEV_OTP_CODE);
    }

    public static function devOtpResponse(): array
    {
        $code = self::devCode();

        return $code ? ['dev_otp' => $code] : [];
    }

    public static function generateOtpCode(): string
    {
        return self::devCode() ?? (string) random_int(100000, 999999);
    }

    private function generateCode(): string
    {
        return self::generateOtpCode();
    }

    private function verifyStoredCode(
        User $user,
        string $purpose,
        string $email,
        ?string $storedHash,
        ?\Illuminate\Support\Carbon $expiresAt,
        string $code,
        string $field,
        string $expiredMessage,
    ): void {
        if (! $storedHash || ! $expiresAt || $expiresAt->isPast()) {
            throw ValidationException::withMessages([
                $field => [$expiredMessage],
            ]);
        }

        $attempts = $this->incrementAttempts($purpose, $email);

        if ($attempts > self::MAX_ATTEMPTS) {
            $this->clearAttempts($purpose, $email);
            throw ValidationException::withMessages([
                $field => ['Too many incorrect attempts. Please request a new code.'],
            ]);
        }

        if (! Hash::check(trim($code), $storedHash)) {
            $left = self::MAX_ATTEMPTS - $attempts;
            throw ValidationException::withMessages([
                $field => [
                    $left > 0
                        ? "Incorrect code. {$left} attempt".($left !== 1 ? 's' : '').' remaining.'
                        : 'Too many attempts. Please request a new code.',
                ],
            ]);
        }

        $this->clearAttempts($purpose, $email);
    }

    private function enforceResendCooldown(string $purpose, string $email): void
    {
        $key = $this->resendKey($purpose, $email);

        if (Cache::has($key)) {
            $seconds = Cache::get($key);
            throw ValidationException::withMessages([
                'email' => ["Please wait {$seconds} seconds before requesting a new code."],
            ]);
        }
    }

    private function markResent(string $purpose, string $email): void
    {
        Cache::put(
            $this->resendKey($purpose, $email),
            self::RESEND_COOLDOWN_SECONDS,
            now()->addSeconds(self::RESEND_COOLDOWN_SECONDS),
        );
    }

    private function resendKey(string $purpose, string $email): string
    {
        return 'otp_resend:'.$purpose.':'.strtolower(trim($email));
    }

    private function attemptsKey(string $purpose, string $email): string
    {
        return 'otp_attempts:'.$purpose.':'.strtolower(trim($email));
    }

    private function incrementAttempts(string $purpose, string $email): int
    {
        $key = $this->attemptsKey($purpose, $email);
        $attempts = (int) Cache::get($key, 0) + 1;
        Cache::put($key, $attempts, now()->addMinutes(30));

        return $attempts;
    }

    private function clearAttempts(string $purpose, string $email): void
    {
        Cache::forget($this->attemptsKey($purpose, $email));
    }
}
