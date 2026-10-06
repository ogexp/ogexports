# Laravel upload-limit patch

`laravel-upload-10mb.patch` applies to the supplied Laravel source snapshot.
It changes only the shared `POST /api/uploads` path for the `deposit-proofs`
folder: accept the mobile app's PDF and image formats up to and including 10 MiB,
and reject larger proof files. Other upload categories keep their existing
limits.

Apply it from the Laravel project root, then run:

```sh
php artisan test --compact tests/Feature/UploadControllerTest.php
```

The production API at `https://api.ogexports.co/api/uploads` responds as a
Laravel endpoint and requires authentication. Its upload-size behavior could
not be checked without an authorized test account. Do not describe the full
mobile 10 MiB range as production-supported until this patch is deployed and
the image and PDF boundary tests are run against production with an authorized
investor account.
