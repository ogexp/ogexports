<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\AmlAlert;
use App\Models\AuditLog;
use App\Models\KycApplication;
use App\Models\KycDocument;
use App\Support\AuditsActions;
use App\Support\MediaStorage;
use App\Support\NotifiesUsers;
use App\Support\PortalNotificationTypes;
use App\Support\UserDisplayCurrency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ComplianceController extends Controller
{
    use PaginatesQueries;

    private const DOC_TYPE_LABELS = [
        'company_registration' => 'Company Registration',
        'import_license' => 'Import License',
        'tax_registration' => 'Tax Registration',
        'kyc_documents' => 'KYC Documents',
        'banking_details' => 'Banking Details',
        'identity' => 'Identity Document',
        'proof_of_address' => 'Proof of Address',
        'ntn_certificate' => 'NTN Certificate',
        'secp_registration' => 'SECP Registration',
        'phytosanitary' => 'Phytosanitary Certificate',
        'iso_haccp' => 'ISO / HACCP Certificate',
        'bank_account_letter' => 'Bank Account Letter',
        'passport_id' => 'Passport / National ID',
        'business_registration' => 'Business Registration Certificate',
        'bank_statement' => 'Bank Statement (3 months)',
        'tax_certificate' => 'Tax Certificate / NTN',
    ];

    public function kycIndex(Request $request): JsonResponse
    {
        $query = KycApplication::query()->with(['user:id,name,email', 'documents']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->whereHas('user', fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%"));
        }

        $paginator = $query->latest('created_at')->orderByDesc('id')->paginate($this->perPage($request));
        $paginator->getCollection()->transform(fn (KycApplication $kyc) => $this->transformKyc($kyc));

        return response()->json($paginator);
    }

    public function kycShow(int $id): JsonResponse
    {
        $kyc = KycApplication::query()
            ->with(['user:id,name,email', 'user.profile', 'documents'])
            ->findOrFail($id);

        return response()->json(['data' => $this->transformKyc($kyc)]);
    }

    public function kycDocumentView(int $kycId, int $documentId): Response
    {
        $doc = $this->findKycDocument($kycId, $documentId);
        abort_unless(MediaStorage::exists($doc->path), 404, 'File not found.');

        $filename = ($doc->original_name ?: $this->docTypeLabel($doc->doc_type)).'.'.pathinfo($doc->path, PATHINFO_EXTENSION);

        return MediaStorage::response($doc->path, $filename);
    }

    public function kycDocumentDownload(int $kycId, int $documentId): StreamedResponse
    {
        $doc = $this->findKycDocument($kycId, $documentId);
        abort_unless(MediaStorage::exists($doc->path), 404, 'File not found.');

        $filename = ($doc->original_name ?: $this->docTypeLabel($doc->doc_type)).'.'.pathinfo($doc->path, PATHINFO_EXTENSION);

        return MediaStorage::download($doc->path, $filename);
    }

    public function kycApprove(Request $request, int $id): JsonResponse
    {
        $kyc = KycApplication::query()->with('user.profile')->findOrFail($id);
        if ($kyc->type === 'investor') {
            $submittedTypes = $kyc->documents->pluck('doc_type')->unique()->all();
            $missingTypes = array_values(array_diff(
                \App\Http\Controllers\Api\Investor\ProfileController::KYC_STEPS,
                $submittedTypes,
            ));

            if ($missingTypes !== []) {
                throw ValidationException::withMessages([
                    'documents' => 'Cannot approve investor KYC while required documents are missing: '.implode(', ', $missingTypes),
                ]);
            }
        }

        $kyc->update([
            'status' => 'approved',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'notes' => $request->input('notes', $kyc->notes),
        ]);

        $profile = $kyc->user?->profile;
        if ($profile) {
            $meta = is_array($profile->meta) ? $profile->meta : [];
            $meta['kyc'] = true;
            $meta['kyc_complete'] = true;
            $profile->update(['meta' => $meta]);
        }

        KycApplication::query()
            ->where('user_id', $kyc->user_id)
            ->where('id', '!=', $kyc->id)
            ->whereIn('type', ['investor', 'individual', 'company'])
            ->whereIn('status', ['pending', 'review'])
            ->update([
                'status' => 'rejected',
                'notes' => 'Superseded by approval of application #'.$id,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

        AuditsActions::log('kyc.approved', 'compliance', $request->user(), ['kyc_id' => $id]);

        if ($kyc->user) {
            $href = PortalNotificationTypes::kycHrefForUser($kyc->user, $kyc->type);
            $body = $kyc->user->hasRole('investor')
                ? 'Your identity verification has been approved. You now have full access to investment and withdrawal features.'
                : 'Your KYC documents have been approved.';

            NotifiesUsers::notifyAndEmail(
                $kyc->user,
                PortalNotificationTypes::KYC_APPROVED,
                'KYC verification approved',
                $body,
                ['kyc_id' => $id, 'href' => $href],
                'kyc_approved',
                ['portal_url' => config('app.frontend_url', config('app.url')).$href]
            );
        }

        return response()->json([
            'message' => 'KYC approved.',
            'data' => $this->transformKyc($kyc->fresh()->load(['user:id,name,email', 'documents'])),
        ]);
    }

    public function kycReject(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string'],
        ]);

        $kyc = KycApplication::query()->findOrFail($id);
        $kyc->update([
            'status' => 'rejected',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'notes' => $data['notes'] ?? $kyc->notes,
        ]);

        AuditsActions::log('kyc.rejected', 'compliance', $request->user(), ['kyc_id' => $id]);

        $kyc->loadMissing('user');
        if ($kyc->user) {
            $href = PortalNotificationTypes::kycHrefForUser($kyc->user, $kyc->type);
            $body = filled($data['notes'] ?? null)
                ? 'Your KYC application was rejected. Reason: '.$data['notes']
                : 'Your KYC application was rejected. Please review your documents and resubmit.';

            NotifiesUsers::notifyAndEmail(
                $kyc->user,
                PortalNotificationTypes::KYC_REJECTED,
                'KYC verification rejected',
                $body,
                ['kyc_id' => $id, 'href' => $href],
                'kyc_rejected',
                [
                    'notes' => $data['notes'] ?? 'Please review your documents and resubmit.',
                    'portal_url' => config('app.frontend_url', config('app.url')).$href,
                ]
            );
        }

        return response()->json([
            'message' => 'KYC rejected.',
            'data' => $this->transformKyc($kyc->fresh()->load(['user:id,name,email', 'documents'])),
        ]);
    }

    public function amlIndex(Request $request): JsonResponse
    {
        $query = AmlAlert::query()->with([
            'user:id,name,email',
            'user.profile:id,user_id,country',
            'user.wallet:id,user_id,currency',
        ]);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $paginator = $query->latest()->paginate($this->perPage($request));
        $paginator->getCollection()->transform(function (AmlAlert $alert) {
            $data = $alert->toArray();
            $data['user'] = UserDisplayCurrency::userPayload($alert->user);

            return $data;
        });

        return response()->json($paginator);
    }

    public function amlUpdate(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['open', 'pending', 'investigating', 'resolved', 'dismissed'])],
            'details' => ['nullable', 'string'],
        ]);

        $alert = AmlAlert::query()->findOrFail($id);
        $alert->update($data);

        AuditsActions::log('aml.updated', 'compliance', $request->user(), ['aml_id' => $id]);

        return response()->json(['data' => $alert->fresh()->load('user:id,name,email')]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $query = AuditLog::query()->with('user:id,name,email');

        if ($module = $request->input('module')) {
            $query->where('module', $module);
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where('action', 'like', "%{$search}%");
        }

        return response()->json($query->latest('created_at')->paginate($this->perPage($request)));
    }

    public function formatKyc(KycApplication $kyc): array
    {
        if (! $kyc->relationLoaded('documents')) {
            $kyc->load('documents');
        }

        return $this->transformKyc($kyc);
    }

    /**
     * @return array<string, mixed>
     */
    private function transformKyc(KycApplication $kyc): array
    {
        return [
            'id' => $kyc->id,
            'user_id' => $kyc->user_id,
            'type' => $kyc->type,
            'country' => $kyc->country,
            'status' => $kyc->status,
            'risk' => $kyc->risk,
            'submitted_at' => $kyc->submitted_at,
            'reviewed_at' => $kyc->reviewed_at,
            'notes' => $kyc->notes,
            'user' => $kyc->relationLoaded('user') && $kyc->user ? [
                'id' => $kyc->user->id,
                'name' => $kyc->user->name,
                'email' => $kyc->user->email,
                'profile' => $kyc->user->relationLoaded('profile') && $kyc->user->profile ? [
                    'country' => $kyc->user->profile->country,
                    'company_name' => $kyc->user->profile->company_name,
                ] : null,
            ] : null,
            'documents' => $kyc->documents->map(fn (KycDocument $doc) => $this->transformDocument($kyc->id, $doc))->values(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformDocument(int $kycId, KycDocument $doc): array
    {
        return [
            'id' => $doc->id,
            'doc_type' => $doc->doc_type,
            'label' => $this->docTypeLabel($doc->doc_type),
            'path' => $doc->path,
            'original_name' => $doc->original_name,
            'url' => MediaStorage::url($doc->path),
            'view_url' => MediaStorage::url($doc->path),
            'download_url' => MediaStorage::url($doc->path),
        ];
    }

    private function docTypeLabel(string $docType): string
    {
        return self::DOC_TYPE_LABELS[$docType] ?? ucwords(str_replace('_', ' ', $docType));
    }

    private function findKycDocument(int $kycId, int $documentId): KycDocument
    {
        return KycDocument::query()
            ->where('kyc_application_id', $kycId)
            ->findOrFail($documentId);
    }
}
