<?php

namespace App\Http\Controllers\Api\Supplier;

use App\Http\Controllers\Controller;
use App\Support\MediaStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\File;

class OfferMediaController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $type = $request->input('type', 'image');

        if ($type === 'video') {
            $request->validate([
                'type' => ['required', 'in:video'],
                'file' => [
                    'required',
                    File::types(['mp4', 'webm', 'mov', 'quicktime'])
                        ->max(25 * 1024),
                ],
            ]);
        } else {
            $request->validate([
                'type' => ['nullable', 'in:image'],
                'file' => [
                    'required',
                    File::image()
                        ->types(['jpg', 'jpeg', 'png', 'webp'])
                        ->max(8 * 1024),
                ],
            ]);
        }

        $stored = MediaStorage::store(
            $request->file('file'),
            'supplier-offers',
            null,
            $request->user(),
        );

        return response()->json([
            'data' => [
                ...$stored,
                'type' => $type === 'video' ? 'video' : 'image',
            ],
        ], 201);
    }
}
