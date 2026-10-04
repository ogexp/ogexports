<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Support\ContainerProjectStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\InvestmentProjectResource;
use App\Models\InvestmentProject;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InvestmentController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = InvestmentProject::query()
            ->whereIn('status', ContainerProjectStatus::allVisibleStatuses());

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('commodity', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($request->filled('category') && $request->input('category') === 'long_term') {
            $query->whereIn('type', ['produce', 'plant', 'ricemill', 'feed']);
        } elseif ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        return InvestmentProjectResource::collection(
            $query->with('documents')->latest()->paginate($this->perPage($request))
        );
    }

    public function show(int $id): InvestmentProjectResource
    {
        $project = InvestmentProject::query()
            ->with('documents')
            ->whereIn('status', ContainerProjectStatus::allVisibleStatuses())
            ->findOrFail($id);

        return new InvestmentProjectResource($project);
    }
}
