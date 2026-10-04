<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\SupplierOffer;
use App\Models\SupplierOfferNote;
use App\Models\UserProfile;
use App\Support\AuditsActions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SupplierOfferController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $query = SupplierOffer::query()->with([
            'supplier:id,name,email,email_verified_at',
            'supplier.profile:id,user_id,country,company_name,rating',
            'notes',
        ]);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%")
                    ->orWhere('origin', 'like', "%{$search}%")
                    ->orWhereHas('supplier', function ($sq) use ($search) {
                        $sq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $sort = $request->input('sort', 'newest');
        match ($sort) {
            'price_asc' => $query->orderBy('price_fob'),
            'rating_desc' => $query->orderByRaw('rating IS NULL ASC')->orderByDesc('rating'),
            default => $query->latest('submitted_at'),
        };

        return response()->json($query->paginate($this->perPage($request, 10)));
    }

    public function stats(): JsonResponse
    {
        $counts = SupplierOffer::query()
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $avgRating = SupplierOffer::query()->whereNotNull('rating')->avg('rating');

        return response()->json([
            'data' => [
                'total' => (int) SupplierOffer::query()->count(),
                'pending' => (int) ($counts['pending'] ?? 0),
                'approved' => (int) ($counts['approved'] ?? 0),
                'hold' => (int) ($counts['hold'] ?? 0),
                'rejected' => (int) ($counts['rejected'] ?? 0),
                'avg_rating' => round((float) ($avgRating ?? 0), 1),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'data' => SupplierOffer::query()
                ->with([
                    'supplier:id,name,email,phone,email_verified_at',
                    'supplier.profile:id,user_id,country,company_name,rating',
                    'notes.admin:id,name',
                ])
                ->findOrFail($id),
        ]);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['pending', 'approved', 'rejected', 'hold'])],
            'note' => ['nullable', 'string'],
        ]);

        $offer = SupplierOffer::query()->findOrFail($id);
        $offer->update(['status' => $data['status']]);

        if (! empty($data['note'])) {
            SupplierOfferNote::create([
                'supplier_offer_id' => $offer->id,
                'admin_id' => $request->user()->id,
                'text' => $data['note'],
            ]);
        }

        AuditsActions::log('supplier_offer.status', 'supplier_offers', $request->user(), [
            'offer_id' => $offer->id,
            'status' => $data['status'],
        ]);

        return response()->json([
            'message' => 'Offer status updated.',
            'data' => $offer->fresh()->load([
                'supplier:id,name,email,email_verified_at',
                'supplier.profile:id,user_id,country,company_name,rating',
                'notes',
            ]),
        ]);
    }

    public function addNote(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'text' => ['required', 'string'],
        ]);

        $offer = SupplierOffer::query()->findOrFail($id);

        $note = SupplierOfferNote::create([
            'supplier_offer_id' => $offer->id,
            'admin_id' => $request->user()->id,
            'text' => $data['text'],
        ]);

        return response()->json(['data' => $note->load('admin:id,name')], 201);
    }

    public function rate(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
        ]);

        $offer = SupplierOffer::query()->findOrFail($id);
        $offer->update(['rating' => $data['rating']]);

        $avg = SupplierOffer::query()
            ->where('supplier_id', $offer->supplier_id)
            ->whereNotNull('rating')
            ->avg('rating');

        UserProfile::query()->updateOrCreate(
            ['user_id' => $offer->supplier_id],
            ['rating' => round((float) $avg, 2)],
        );

        AuditsActions::log('supplier_offer.rate', 'supplier_offers', $request->user(), [
            'offer_id' => $offer->id,
            'rating' => $data['rating'],
            'supplier_avg' => round((float) $avg, 2),
        ]);

        return response()->json([
            'data' => $offer->fresh()->load([
                'supplier:id,name,email,email_verified_at',
                'supplier.profile:id,user_id,country,company_name,rating',
                'notes',
            ]),
        ]);
    }
}
