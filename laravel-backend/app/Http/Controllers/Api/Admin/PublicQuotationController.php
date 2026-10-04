<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Support\AuditsActions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicQuotationController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $query = ContactMessage::query()
            ->where(function ($q) {
                $q->where('type', 'public_quote')
                    ->orWhere('subject', 'like', 'Quote Request:%');
            })
            ->latest();

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->paginate($this->perPage($request)));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $msg = ContactMessage::query()->findOrFail($id);
        $data = $request->validate([
            'status' => ['required', 'string', 'in:new,read,replied,archived'],
        ]);

        $msg->update(['status' => $data['status']]);

        AuditsActions::log('public_quote.'.$data['status'], 'quotations', $request->user(), [
            'contact_message_id' => $id,
        ]);

        return response()->json(['message' => 'Updated.', 'data' => $msg->fresh()]);
    }
}
