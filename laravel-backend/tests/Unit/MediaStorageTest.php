<?php

use App\Support\MediaStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

uses(TestCase::class);

afterEach(function () {
    $uploadRoot = public_path('upload');
    if (File::isDirectory($uploadRoot)) {
        File::deleteDirectory($uploadRoot);
    }

    Storage::disk('public')->deleteDirectory('uploads/legacy-test');
});

it('resolves direct public upload urls', function () {
    $url = MediaStorage::url('upload/kyc/5/passport.jpg');

    expect($url)->toContain('/upload/kyc/5/passport.jpg');
});

it('resolves legacy storage urls', function () {
    Storage::disk('public')->put('uploads/legacy-test/sample.jpg', 'legacy');

    $url = MediaStorage::url('uploads/legacy-test/sample.jpg');

    expect($url)->toContain('/storage/uploads/legacy-test/sample.jpg');
});

it('resolves product and investment image urls', function () {
    expect(MediaStorage::url('product_images/item.jpg'))->toContain('/product_images/item.jpg')
        ->and(MediaStorage::url('investment_images/cover.jpg'))->toContain('/investment_images/cover.jpg');
});

it('passes through external cdn urls unchanged', function () {
    $external = 'https://ogexports.co/assets/Screenshot_2026-03-04_at_10.20.16_PM_1775121609953--GHDzNET.png';

    expect(MediaStorage::url($external))->toBe($external);
});

it('stores uploads under public upload directories', function () {
    $file = UploadedFile::fake()->image('proof.jpg');

    $stored = MediaStorage::store($file, 'deposits', 12);

    expect($stored['path'])->toStartWith('upload/deposits/12/')
        ->and(File::exists(public_path($stored['path'])))->toBeTrue()
        ->and($stored['url'])->toContain($stored['path']);
});

it('finds files in both public upload and legacy storage', function () {
    $publicPath = 'upload/kyc/1/doc.jpg';
    File::ensureDirectoryExists(public_path('upload/kyc/1'));
    File::put(public_path($publicPath), 'public');

    Storage::disk('public')->put('uploads/legacy-test/old.jpg', 'legacy');

    expect(MediaStorage::exists($publicPath))->toBeTrue()
        ->and(MediaStorage::exists('uploads/legacy-test/old.jpg'))->toBeTrue();
});

it('validates allowed path prefixes for categories', function () {
    expect(MediaStorage::isAllowedPath('upload/rfq/3/file.pdf', ['rfq']))->toBeTrue()
        ->and(MediaStorage::isAllowedPath('uploads/rfq-attachments/file.pdf', ['rfq']))->toBeTrue()
        ->and(MediaStorage::isAllowedPath('upload/deposits/7/proof.jpg', ['deposits']))->toBeTrue()
        ->and(MediaStorage::isAllowedPath('uploads/deposit-proofs/file.jpg', ['deposits']))->toBeTrue()
        ->and(MediaStorage::isAllowedPath('uploads/general/other.jpg', ['general']))->toBeTrue()
        ->and(MediaStorage::isAllowedPath('upload/messages/1/file.jpg', ['rfq']))->toBeFalse();
});

it('moves deposit proof into deposit specific folder', function () {
    $source = 'upload/deposits/9/proof.jpg';
    File::ensureDirectoryExists(public_path('upload/deposits/9'));
    File::put(public_path($source), 'proof');

    $moved = MediaStorage::moveDepositProof($source, 42, 9);

    expect($moved)->toBe('upload/deposits/42/proof.jpg')
        ->and(File::exists(public_path($moved)))->toBeTrue()
        ->and(File::exists(public_path($source)))->toBeFalse();
});
