<?php

$envOrigins = array_values(array_filter(array_map(
    'trim',
    explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')),
)));

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout', 'register'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_unique(array_filter(array_merge(
        [
            env('FRONTEND_URL', 'http://localhost:5003'),
            'https://ogexports.co',
            'https://www.ogexports.co',
            'http://localhost:8000',
            'http://localhost:5000',
            'http://127.0.0.1:5000',
            'http://localhost:5003',
            'http://127.0.0.1:5003',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:5055',
            'http://127.0.0.1:5055',
        ],
        $envOrigins,
    )))),

    'allowed_origins_patterns' => in_array(
        parse_url(env('APP_URL', ''), PHP_URL_HOST),
        ['localhost', '127.0.0.1'],
        true,
    )
        ? ['#^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?$#']
        : [],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['Content-Disposition', 'Content-Type'],

    'max_age' => 0,

    'supports_credentials' => true,

];
