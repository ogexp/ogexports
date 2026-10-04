<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailTemplate;
use Database\Seeders\EmailTemplateSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

class MaintController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $this->authorizeToken($request);

        return response()->json([
            'ok' => true,
            'app_env' => config('app.env'),
            'app_debug' => (bool) config('app.debug'),
            'app_url' => config('app.url'),
            'mail' => $this->mailDiagnostics(),
            'templates' => $this->templateDiagnostics(),
        ]);
    }

    public function migrate(Request $request): JsonResponse
    {
        $this->authorizeToken($request);

        Artisan::call('migrate', ['--force' => true]);

        return response()->json([
            'ok' => true,
            'output' => Artisan::output(),
        ]);
    }

    public function cacheClear(Request $request): JsonResponse
    {
        $this->authorizeToken($request);

        Artisan::call('optimize:clear');

        return response()->json([
            'ok' => true,
            'output' => Artisan::output(),
            'mail' => $this->mailDiagnostics(),
        ]);
    }

    public function seedEmailTemplates(Request $request): JsonResponse
    {
        $this->authorizeToken($request);

        if (! Schema::hasTable('email_templates')) {
            return response()->json([
                'ok' => false,
                'error' => 'email_templates table missing. Run migrate first.',
            ], 500);
        }

        Artisan::call('db:seed', [
            '--class' => EmailTemplateSeeder::class,
            '--force' => true,
        ]);

        return response()->json([
            'ok' => true,
            'output' => Artisan::output(),
            'templates' => $this->templateDiagnostics(),
        ]);
    }

    public function mailProbe(Request $request): JsonResponse
    {
        $this->authorizeToken($request);

        $to = (string) $request->query('to', config('mail.from.address'));
        if (! filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return response()->json(['ok' => false, 'error' => 'Invalid to email.'], 422);
        }

        $started = microtime(true);

        try {
            Mail::raw(
                'OGExport production SMTP probe at '.now()->toIso8601String()."\n\nIf you received this, live SMTP works.",
                function ($message) use ($to) {
                    $message->to($to)->subject('OGExport production SMTP probe');
                }
            );

            return response()->json([
                'ok' => true,
                'sent_to' => $to,
                'ms' => (int) round((microtime(true) - $started) * 1000),
                'mail' => $this->mailDiagnostics(),
                'templates' => $this->templateDiagnostics(),
            ]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'ok' => false,
                'sent_to' => $to,
                'error' => $e->getMessage(),
                'ms' => (int) round((microtime(true) - $started) * 1000),
                'mail' => $this->mailDiagnostics(),
                'templates' => $this->templateDiagnostics(),
                'hint' => $this->mailFailureHint($e->getMessage()),
            ], 500);
        }
    }

    /**
     * Apply quotation-contact PHP files from storage/app/quotation-contact-deploy.b64.json
     * (token-gated). Used when SSH paste is unavailable but the bundle was uploaded via File Manager.
     */
    public function applyQuotationContact(Request $request): JsonResponse
    {
        $this->authorizeToken($request);

        $json = null;
        $bundlePath = 'request_body';

        // Prefer POST/JSON body so File Manager upload is optional after this endpoint exists.
        $payload = $request->all();
        if (isset($payload['files']) && is_array($payload['files'])) {
            $json = $payload['files'];
        } elseif ($request->isJson() && is_array($request->json()->all()) && ! empty($request->json()->all())) {
            $candidate = $request->json()->all();
            // Direct map of relative path => base64
            $firstKey = array_key_first($candidate);
            if (is_string($firstKey) && (str_starts_with($firstKey, 'app/') || $firstKey === 'routes/api.php')) {
                $json = $candidate;
            }
        }

        if ($json === null) {
            $candidates = [
                storage_path('app/quotation-contact-deploy.b64.json'),
                base_path('quotation-contact-deploy.b64.json'),
            ];

            $bundlePath = null;
            foreach ($candidates as $path) {
                if (is_file($path)) {
                    $bundlePath = $path;
                    break;
                }
            }

            if ($bundlePath === null) {
                return response()->json([
                    'ok' => false,
                    'error' => 'Bundle missing. Upload storage/app/quotation-contact-deploy.b64.json or POST files map.',
                ], 404);
            }

            $json = json_decode((string) file_get_contents($bundlePath), true);
        }

        if (! is_array($json)) {
            return response()->json(['ok' => false, 'error' => 'Invalid bundle JSON.'], 500);
        }

        $wrote = [];
        foreach ($json as $relative => $b64) {
            if (! is_string($relative) || ! is_string($b64)) {
                continue;
            }
            if (
                ! str_starts_with($relative, 'app/')
                && $relative !== 'routes/api.php'
                && $relative !== 'config/mail.php'
            ) {
                continue;
            }
            $target = base_path($relative);
            $dir = dirname($target);
            if (! is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            if (is_file($target)) {
                copy($target, $target.'.bak-quotation-'.date('YmdHis'));
            }
            $decoded = base64_decode($b64, true);
            if ($decoded === false) {
                return response()->json(['ok' => false, 'error' => "Invalid base64 for {$relative}"], 500);
            }
            file_put_contents($target, $decoded);
            $wrote[] = $relative;
        }

        Artisan::call('migrate', ['--force' => true]);
        $migrateOutput = Artisan::output();
        Artisan::call('optimize:clear');
        $clearOutput = Artisan::output();

        return response()->json([
            'ok' => true,
            'bundle' => $bundlePath,
            'wrote' => $wrote,
            'migrate' => $migrateOutput,
            'cache' => $clearOutput,
            'mail' => $this->mailDiagnostics(),
            'quote_to' => config('mail.quote_to'),
        ]);
    }

    private function authorizeToken(Request $request): void
    {
        $expected = (string) config('app.maint_token', env('MAINT_TOKEN'));
        $given = (string) $request->query('token', '');

        if ($expected === '' || ! hash_equals($expected, $given)) {
            abort(403, 'Invalid maintenance token.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function mailDiagnostics(): array
    {
        $password = (string) config('mail.mailers.smtp.password');

        return [
            'mailer' => config('mail.default'),
            'host' => config('mail.mailers.smtp.host'),
            'port' => config('mail.mailers.smtp.port'),
            'scheme' => config('mail.mailers.smtp.scheme'),
            'username' => config('mail.mailers.smtp.username'),
            'from' => config('mail.from.address'),
            'from_name' => config('mail.from.name'),
            'password_set' => $password !== '',
            'password_length' => strlen($password),
            // "Test@#6260" is 10 chars. Unquoted .env with # becomes "Test@" (5 chars).
            'password_looks_truncated_by_hash_comment' => strlen($password) === 5 && str_starts_with($password, 'Test@'),
            'ehlo_domain' => config('mail.mailers.smtp.local_domain'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function templateDiagnostics(): array
    {
        if (! Schema::hasTable('email_templates')) {
            return [
                'table_exists' => false,
                'registration_otp' => false,
                'password_reset_otp' => false,
            ];
        }

        $slugs = EmailTemplate::query()
            ->whereIn('slug', ['registration_otp', 'password_reset_otp', 'withdraw_otp'])
            ->get(['slug', 'is_active'])
            ->keyBy('slug');

        return [
            'table_exists' => true,
            'registration_otp' => (bool) ($slugs['registration_otp']->is_active ?? false),
            'password_reset_otp' => (bool) ($slugs['password_reset_otp']->is_active ?? false),
            'withdraw_otp' => (bool) ($slugs['withdraw_otp']->is_active ?? false),
            'total_active' => EmailTemplate::query()->where('is_active', true)->count(),
        ];
    }

    private function mailFailureHint(string $error): string
    {
        $lower = strtolower($error);

        if (str_contains($lower, 'authentication') || str_contains($lower, '535') || str_contains($lower, 'login')) {
            return 'SMTP auth failed. On Hostinger, quote MAIL_PASSWORD because # starts a comment. Example: MAIL_PASSWORD="Test@#6260". Then run config:clear.';
        }

        if (str_contains($lower, 'connection') || str_contains($lower, 'timed out') || str_contains($lower, 'refused')) {
            return 'Cannot reach SMTP host. Try MAIL_HOST=smtp.hostinger.com MAIL_PORT=465 MAIL_SCHEME=smtps, or ask Hostinger if outbound SMTP is allowed.';
        }

        return 'Check storage/logs/laravel.log for auth.email.failed details.';
    }
}
