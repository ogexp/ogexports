<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Controllers\CsrfCookieController;

// Explicit Sanctum CSRF route so it survives `php artisan route:cache`
// (SanctumServiceProvider skips route registration when routes are cached).
Route::get('/sanctum/csrf-cookie', [CsrfCookieController::class, 'show'])
    ->middleware('web')
    ->name('sanctum.csrf-cookie');

Route::get('/', function () {
    return view('welcome');
});

Route::get('/product_images/{filename}', function (string $filename) {
    $path = public_path('product_images/'.$filename);
    abort_unless(File::isFile($path), 404);

    return response()->file($path, [
        'Cache-Control' => 'public, max-age=86400',
    ]);
})->where('filename', '[A-Za-z0-9._-]+');

Route::get('/upload/{path}', function (string $path) {
    $path = str_replace(['..', '\\'], ['', '/'], $path);
    $fullPath = public_path('upload/'.$path);
    abort_unless(File::isFile($fullPath), 404);

    return response()->file($fullPath, [
        'Cache-Control' => 'public, max-age=86400',
    ]);
})->where('path', '.*');

Route::get('/storage/{path}', function (string $path) {
    $path = str_replace(['..', '\\'], ['', '/'], $path);
    $fullPath = storage_path('app/public/'.$path);
    abort_unless(File::isFile($fullPath), 404);

    return response()->file($fullPath, [
        'Cache-Control' => 'public, max-age=86400',
    ]);
})->where('path', '.*');

// Maintenance endpoints moved to /api/maint/* (see routes/api.php).
