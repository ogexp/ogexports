<?php

namespace App\Support;

use App\Models\User;
use App\Services\AuthOtpService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Request;

class AuthFlowLogger
{
    /**
     * @param  array<string, mixed>  $context
     */
    public static function info(string $event, array $context = []): void
    {
        self::write('info', $event, $context);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public static function warning(string $event, array $context = []): void
    {
        self::write('warning', $event, $context);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public static function error(string $event, array $context = []): void
    {
        self::write('error', $event, $context);
    }

    /**
     * Log OTP generation. Includes otp_code only when email delivery failed
     * so live recovery is possible without permanently logging every code.
     *
     * @param  User|string  $userOrEmail
     */
    public static function logOtpGenerated(
        string $purpose,
        string $trigger,
        User|string $userOrEmail,
        string $code,
        bool $emailSent,
        ?int $userId = null,
        ?int $expiresMinutes = null,
    ): void {
        $email = $userOrEmail instanceof User ? $userOrEmail->email : $userOrEmail;
        $resolvedUserId = $userId ?? ($userOrEmail instanceof User ? $userOrEmail->id : null);

        $context = [
            'purpose' => $purpose,
            'trigger' => $trigger,
            'email' => $email,
            'user_id' => $resolvedUserId,
            'email_sent' => $emailSent,
            'expires_minutes' => $expiresMinutes,
        ];

        if ($emailSent) {
            self::info('auth.otp.generated', $context);

            return;
        }

        $context['otp_code'] = $code;
        self::warning('auth.otp.generated_for_recovery', $context);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private static function write(string $level, string $event, array $context): void
    {
        if (isset($context['email']) && is_string($context['email'])) {
            $context['email'] = AuthOtpService::maskEmail($context['email']);
        }

        $payload = array_merge([
            'event' => $event,
            'ip' => Request::ip(),
        ], $context);

        Log::log($level, $event, $payload);
    }
}
