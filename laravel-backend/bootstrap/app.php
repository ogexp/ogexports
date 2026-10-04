<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;
use App\Http\Middleware\EnsureInvestmentModuleEnabled;
use App\Http\Middleware\EnsureSupplierModuleEnabled;
use App\Http\Middleware\ValidateCsrfToken;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->prepend(HandleCors::class);

        // Hostinger CDN / reverse proxy terminates TLS in front of PHP.
        $middleware->trustProxies(at: '*');

        // API-only app: return 401 JSON instead of redirecting to a missing login route.
        $middleware->redirectGuestsTo(fn (Request $request) => ($request->is('api/*') || $request->expectsJson()) ? null : '/');

        $middleware->statefulApi();

        // Flutter web / mobile Bearer auth — custom CSRF rules (see ValidateCsrfToken).
        // Sanctum stateful API pipeline uses config('sanctum.middleware.validate_csrf_token').
        $middleware->web(replace: [
            PreventRequestForgery::class => ValidateCsrfToken::class,
        ]);

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'supplier_module' => EnsureSupplierModuleEnabled::class,
            'investment_module' => EnsureInvestmentModuleEnabled::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*')
                || $request->is('sanctum/*')
                || $request->expectsJson(),
        );
    })->create();
