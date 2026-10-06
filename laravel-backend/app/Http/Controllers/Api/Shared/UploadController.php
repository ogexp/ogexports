<?php

namespace App\Http\Controllers\Api\Shared;

use App\Http\Controllers\Controller;
use App\Support\MediaStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

class UploadController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file'],
            'category' => ['nullable', 'string', 'max:100', Rule::in(MediaStorage::ALLOWED_CATEGORIES)],
            'item_id' => ['nullable', 'integer', 'min:1'],
            'folder' => ['nullable', 'string', 'max:100', 'regex:/^[a-zA-Z0-9_\-\/]+$/'],
        ]);

        $category = $data['category']
            ?? MediaStorage::categoryFromLegacyFolder($data['folder'] ?? null);

        $file = $request->file('file');
        $mime = (string) $file->getMimeType();
        $isImage = str_starts_with(strtolower($mime), 'image/');
        $maxImageSizeKb = $category === 'kyc' ? 10 * 1024 : 8 * 1024;

        if ($isImage) {
            $request->validate([
                'file' => [
                    'required',
                    File::image()
                        ->types(['jpg', 'jpeg', 'png', 'gif', 'webp'])
                        ->max($maxImageSizeKb),
                ],
            ]);
        } else {
            $request->validate([
                'file' => [
                    'required',
                    'file',
                    'max:20480',
                    'mimes:pdf,doc,docx,xls,xlsx,mp4,webm,mov,avi',
                ],
            ]);
        }

        $stored = MediaStorage::store(
            $file,
            $category,
            isset($data['item_id']) ? (int) $data['item_id'] : null,
            $request->user(),
        );

        return response()->json([
            'data' => $stored,
        ], 201);
    }
}
