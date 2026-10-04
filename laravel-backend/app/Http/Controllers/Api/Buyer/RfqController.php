<?php

namespace App\Http\Controllers\Api\Buyer;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\Port;
use App\Models\Product;
use App\Models\Rfq;
use App\Models\RfqAttachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Support\MediaStorage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RfqController extends Controller
{
    use PaginatesQueries;

    private const ALLOWED_ATTACHMENT_MIMES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    public function index(Request $request): JsonResponse
    {
        $query = Rfq::query()
            ->where('buyer_id', $request->user()->id)
            ->with([
                'product:id,name,slug',
                'country:id,code,name',
                'port:id,country_id,unlocode,name',
                'quotations',
                'attachments',
            ]);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $paginator = $query->latest()->paginate($this->perPage($request));
        $paginator->getCollection()->transform(fn (Rfq $rfq) => $this->transform($rfq));

        return response()->json($paginator);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['nullable', 'exists:products,id'],
            'product_name' => ['required_without:product_id', 'string', 'max:255'],
            'qty' => ['required', 'string', 'max:100'],
            'packaging' => ['nullable', 'string', 'max:255'],
            'country_id' => ['required', 'integer', 'exists:countries,id'],
            'port_id' => [
                'required',
                'integer',
                Rule::exists('ports', 'id')->where(
                    fn ($query) => $query->where('country_id', $request->integer('country_id')),
                ),
            ],
            'incoterm' => ['required', 'string', 'max:50'],
            'payment_terms' => ['required', 'string', 'max:255'],
            'required_delivery_date' => ['required', 'date', 'after:today'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'attachments' => ['nullable', 'array', 'max:5'],
            'attachments.*.path' => ['required_with:attachments', 'string', 'max:500'],
            'attachments.*.original_name' => ['nullable', 'string', 'max:255'],
            'attachments.*.mime' => ['nullable', 'string', 'max:120'],
            'attachments.*.size' => ['nullable', 'integer', 'min:0'],
        ]);

        $productName = $data['product_name'] ?? null;
        if (! empty($data['product_id']) && ! $productName) {
            $productName = Product::query()->find($data['product_id'])?->name;
        }

        $port = Port::query()->with('country:id,name')->findOrFail($data['port_id']);
        $attachments = $this->normalizeAttachments($data['attachments'] ?? []);

        $rfq = DB::transaction(function () use ($request, $data, $productName, $port, $attachments) {
            $rfq = Rfq::create([
                'buyer_id' => $request->user()->id,
                'product_id' => $data['product_id'] ?? null,
                'product_name' => $productName,
                'qty' => $data['qty'],
                'packaging' => $data['packaging'] ?? null,
                'destination' => "{$port->name}, {$port->country->name}",
                'country_id' => $data['country_id'],
                'port_id' => $data['port_id'],
                'incoterm' => $data['incoterm'],
                'payment_terms' => $data['payment_terms'],
                'required_delivery_date' => $data['required_delivery_date'],
                'notes' => $data['notes'] ?? null,
                'status' => 'pending',
                'submitted_at' => now(),
            ]);

            foreach ($attachments as $attachment) {
                RfqAttachment::create([
                    'rfq_id' => $rfq->id,
                    ...$attachment,
                ]);
            }

            return $rfq;
        });

        $rfq->load([
            'product:id,name,slug',
            'country:id,code,name',
            'port:id,country_id,unlocode,name',
            'attachments',
        ]);

        return response()->json(['data' => $this->transform($rfq)], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $rfq = Rfq::query()
            ->where('buyer_id', $request->user()->id)
            ->with(['product', 'country', 'port', 'quotations', 'attachments'])
            ->findOrFail($id);

        return response()->json(['data' => $this->transform($rfq)]);
    }

    /**
     * @param  array<int, array{path?: string, original_name?: string|null, mime?: string|null, size?: int|null}>  $items
     * @return array<int, array{path: string, original_name: string|null, mime: string|null, size: int|null}>
     */
    private function normalizeAttachments(array $items): array
    {
        $normalized = [];

        foreach ($items as $item) {
            $path = ltrim((string) ($item['path'] ?? ''), '/');
            if ($path === '' || str_contains($path, '..')) {
                throw ValidationException::withMessages([
                    'attachments' => ['Invalid attachment path.'],
                ]);
            }

            if (! MediaStorage::isAllowedPath($path, ['rfq', 'general'])) {
                throw ValidationException::withMessages([
                    'attachments' => ['Attachment path must be under upload/rfq/ or legacy uploads/rfq-attachments/.'],
                ]);
            }

            if (! MediaStorage::exists($path)) {
                throw ValidationException::withMessages([
                    'attachments' => ["Uploaded file not found: {$path}"],
                ]);
            }

            $mime = $item['mime'] ?? MediaStorage::mimeType($path);
            if ($mime && ! in_array($mime, self::ALLOWED_ATTACHMENT_MIMES, true)) {
                $name = strtolower((string) ($item['original_name'] ?? $path));
                $okByExt = (bool) preg_match('/\.(jpe?g|png|gif|webp|bmp|pdf|docx?|xlsx?)$/i', $name);
                if (! $okByExt) {
                    throw ValidationException::withMessages([
                        'attachments' => ['Only images, PDF, DOC, DOCX, XLS, and XLSX are allowed.'],
                    ]);
                }
            }

            $normalized[] = [
                'path' => $path,
                'original_name' => $item['original_name'] ?? basename($path),
                'mime' => $mime,
                'size' => isset($item['size']) ? (int) $item['size'] : MediaStorage::size($path),
            ];
        }

        return $normalized;
    }

    private function transform(Rfq $rfq): array
    {
        $data = $rfq->toArray();
        $data['attachments'] = $rfq->attachments
            ->map(fn (RfqAttachment $a) => $a->toApiArray())
            ->values()
            ->all();

        return $data;
    }
}
