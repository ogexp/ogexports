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

## USD wallet normalization patch set

Apply both patches, in order, to the supplied Laravel source from its project
root. Profile currency remains a display preference; new wallets default to
USD, and changing Profile currency never changes wallet denomination. The
second patch adds a report-only-by-default command to convert safe legacy
wallets to USD, records each conversion, and preserves historical transaction
currencies. Neither patch touches `.env`.

Apply and verify it with:

```sh
git apply --check /path/to/wallet-currency-sync.patch
git apply /path/to/wallet-currency-sync.patch
git apply --check /path/to/wallet-currency-usd.patch
git apply /path/to/wallet-currency-usd.patch
php artisan migrate --force
php artisan test --compact tests/Feature/MobileInvestorWalletTest.php tests/Unit/UserDisplayCurrencyDualTest.php
php artisan wallets:normalize-usd
```

Run the commands from the Laravel project root, replacing each patch path with
the downloaded file's location.

The migration only creates the conversion-audit table; it does not change
wallet balances. The normalization command is a dry run unless `--apply` is
provided. Review its conversion totals and skipped-wallet reasons first, and
only run `php artisan wallets:normalize-usd --apply` after the affected
pending or unresolved operations have been settled.
