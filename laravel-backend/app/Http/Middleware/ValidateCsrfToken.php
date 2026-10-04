<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken as Middleware;

class ValidateCsrfToken extends Middleware
{
    /**
     * Public mobile / Flutter auth POSTs (Bearer tokens, no session CSRF).
     *
     * @var array<int, string>
     */
    protected $except = [
        'api/auth/mobile/*',
        'api/mobile/v1/auth/*',
        'api/auth/register',
        'api/auth/resend-verification',
        'api/auth/forgot-password',
        'api/auth/verify-reset-otp',
        'api/auth/reset-password',
    ];

    /**
     * Skip CSRF when the client authenticates with a Sanctum personal access token.
     *
     * @param  \Illuminate\Http\Request  $request
     */
    protected function inExceptArray($request): bool
    {
        if ($request->bearerToken()) {
            return true;
        }

        return parent::inExceptArray($request);
    }
}
