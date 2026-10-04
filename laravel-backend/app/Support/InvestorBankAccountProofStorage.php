<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class InvestorBankAccountProofStorage
{
    /**
     * @return array{path: string, name: string, mime: string|null, size: int}
     */
    public static function store(UploadedFile $file, int $investorId): array
    {
        $extension = strtolower($file->guessExtension() ?: $file->getClientOriginalExtension());
        $extension = match ($extension) {
            'jpeg' => 'jpg',
            'jpg', 'png', 'webp', 'pdf' => $extension,
            default => throw new RuntimeException('Unsupported bank proof file type.'),
        };

        $path = Storage::disk('local')->putFileAs(
            'bank-account-proofs/'.$investorId,
            $file,
            Str::uuid().'.'.$extension,
        );

        if (! is_string($path) || $path === '') {
            throw new RuntimeException('The private bank proof could not be stored.');
        }

        return [
            'path' => $path,
            'name' => mb_substr($file->getClientOriginalName(), 0, 255),
            'mime' => $file->getMimeType(),
            'size' => (int) $file->getSize(),
        ];
    }
}