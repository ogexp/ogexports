<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Support\AdminModuleCountService;
use App\Support\AdminModuleKeys;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ModuleCountController extends Controller
{
    public function __construct(
        private readonly AdminModuleCountService $counts,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->counts->countsFor($request->user()),
        ]);
    }

    public function markViewed(Request $request, string $module): JsonResponse
    {
        if (! AdminModuleKeys::isValid($module)) {
            throw ValidationException::withMessages([
                'module' => ['Unknown admin module.'],
            ]);
        }

        $this->counts->markViewed($request->user(), $module);

        return response()->json([
            'message' => 'Module marked as viewed.',
            'data' => $this->counts->countsFor($request->user()),
        ]);
    }
}
