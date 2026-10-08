<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\KycApplication;
use App\Models\KycDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class KycController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $items = KycApplication::query()
            ->where('user_id', $request->user()->id)
            ->with('documents')
            ->latest('created_at')
            ->orderByDesc('id')
            ->paginate($this->perPage($request));

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', 'string', 'max:50'],
            'country' => ['nullable', 'string', 'max:100'],
            'payload' => ['nullable', 'array'],
            'documents' => ['nullable', 'array'],
            'documents.*.doc_type' => ['required_with:documents', 'string', 'max:100'],
            'documents.*.path' => ['required_with:documents', 'string', 'max:1000'],
            'documents.*.original_name' => ['nullable', 'string', 'max:255'],
        ]);

        if ($data['type'] === 'investor') {
            $submittedTypes = array_column($data['documents'] ?? [], 'doc_type');
            $missingTypes = array_values(array_diff(ProfileController::KYC_STEPS, $submittedTypes));

            if ($missingTypes !== []) {
                throw ValidationException::withMessages([
                    'documents' => 'Upload all required KYC documents before submitting: '.implode(', ', $missingTypes),
                ]);
            }
        }

        $userId = $request->user()->id;
        $investorTypes = ['investor', 'individual', 'company'];

        $existingPending = KycApplication::query()
            ->where('user_id', $userId)
            ->whereIn('type', $investorTypes)
            ->whereIn('status', ['pending', 'review'])
            ->latest('created_at')
            ->orderByDesc('id')
            ->first();

        if ($existingPending) {
            $kyc = $existingPending;
            $kyc->update([
                'type' => $data['type'],
                'country' => $data['country'] ?? $kyc->country,
                'submitted_at' => now(),
                'payload' => $data['payload'] ?? $kyc->payload,
            ]);
        } else {
            $alreadyApproved = KycApplication::query()
                ->where('user_id', $userId)
                ->whereIn('type', $investorTypes)
                ->where('status', 'approved')
                ->exists();

            if ($alreadyApproved) {
                $kyc = KycApplication::query()
                    ->where('user_id', $userId)
                    ->whereIn('type', $investorTypes)
                    ->where('status', 'approved')
                    ->latest('created_at')
                    ->orderByDesc('id')
                    ->first();

                return response()->json([
                    'message' => 'KYC already approved.',
                    'data' => $kyc?->load('documents'),
                ]);
            }

            $kyc = KycApplication::create([
                'user_id' => $userId,
                'type' => $data['type'],
                'country' => $data['country'] ?? null,
                'status' => 'pending',
                'submitted_at' => now(),
                'payload' => $data['payload'] ?? null,
            ]);
        }

        foreach ($data['documents'] ?? [] as $doc) {
            KycDocument::query()
                ->where('kyc_application_id', $kyc->id)
                ->where('doc_type', $doc['doc_type'])
                ->delete();

            KycDocument::create([
                'kyc_application_id' => $kyc->id,
                'doc_type' => $doc['doc_type'],
                'path' => $doc['path'],
                'original_name' => $doc['original_name'] ?? null,
            ]);
        }

        return response()->json([
            'message' => 'KYC application submitted.',
            'data' => $kyc->load('documents'),
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $kyc = KycApplication::query()
            ->where('user_id', $request->user()->id)
            ->with('documents')
            ->findOrFail($id);

        return response()->json(['data' => $kyc]);
    }
}
