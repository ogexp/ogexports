<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\KycApplication;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Wallet;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use App\Support\AuditsActions;
use App\Support\InvestmentModule;
use App\Support\SupplierModule;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    use PaginatesQueries;

    public function __construct(
        private ComplianceController $compliance,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = User::query()->with(['profile', 'roles', 'latestKycApplication.documents', 'wallet'])
            ->withCount('orders')
            ->withSum('orders as order_value_total', 'total_value')
            ->withSum(['investments as portfolio_total' => function ($q) {
                $q->whereIn('status', ['pending', 'active', 'completed']);
            }], 'amount');

        if ($role = $request->input('role')) {
            $query->role($role);
        }

        if ($status = $request->input('status')) {
            $query->where('account_status', $status);
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        return UserResource::collection(
            $query->orderByDesc('created_at')->paginate($this->perPage($request))
        );
    }

    public function show(int $id): UserResource
    {
        $user = User::query()->with(['profile', 'roles', 'latestKycApplication.documents'])->findOrFail($id);

        return new UserResource($user);
    }

    public function userKyc(int $id): JsonResponse
    {
        $user = User::query()->findOrFail($id);
        $kyc = KycApplication::query()
            ->where('user_id', $user->id)
            ->with(['documents', 'user:id,name,email'])
            ->latest()
            ->first();

        if (! $kyc) {
            return response()->json(['data' => null]);
        }

        return response()->json([
            'data' => $this->compliance->formatKyc($kyc),
        ]);
    }

    public function impersonate(Request $request, int $id): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();
        abort_unless($admin->hasRole('admin'), 403);

        $target = User::query()->with(['profile', 'roles'])->findOrFail($id);

        if ($target->hasRole('admin')) {
            return response()->json(['message' => 'Cannot impersonate admin users.'], 422);
        }

        if ($target->id === $admin->id) {
            return response()->json(['message' => 'You are already logged in as this user.'], 422);
        }

        if (! $target->isActive()) {
            return response()->json(['message' => 'Cannot impersonate a suspended user.'], 422);
        }

        if ($target->hasRole('supplier') && ! SupplierModule::enabled()) {
            return response()->json(['message' => SupplierModule::disabledMessage()], 403);
        }

        if ($target->hasRole('investor') && ! InvestmentModule::enabled()) {
            return response()->json(['message' => InvestmentModule::disabledMessage()], 403);
        }

        $request->session()->put('impersonator_id', $admin->id);
        Auth::guard('web')->login($target);

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        AuditsActions::log('user.impersonated', 'users', $admin, [
            'target_user_id' => $target->id,
            'target_email' => $target->email,
        ]);

        return response()->json([
            'message' => 'Impersonation started.',
            'user' => new UserResource($target),
            'redirect' => $target->dashboardPath(),
            'impersonating' => true,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', Password::defaults()],
            'phone' => ['nullable', 'string', 'max:50'],
            'role' => ['required', Rule::in(['admin', 'buyer', 'supplier', 'investor'])],
            'company_name' => ['nullable', 'string', 'max:255'],
            'dept' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
        ]);

        if ($data['role'] === 'supplier' && ! SupplierModule::enabled()) {
            return response()->json(['message' => SupplierModule::disabledMessage()], 403);
        }

        if ($data['role'] === 'investor' && ! InvestmentModule::enabled()) {
            return response()->json(['message' => InvestmentModule::disabledMessage()], 403);
        }

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => $data['password'],
            'account_status' => 'active',
            'email_verified_at' => now(),
        ]);

        $user->assignRole($data['role']);

        UserProfile::create([
            'user_id' => $user->id,
            'company_name' => $data['company_name'] ?? null,
            'dept' => $data['dept'] ?? null,
            'country' => $data['country'] ?? null,
            'meta' => $data['role'] === 'investor'
                ? ['preferences' => ['currency' => 'USD']]
                : [],
        ]);

        if ($data['role'] === 'investor') {
            Wallet::create([
                'user_id' => $user->id,
                'currency' => 'USD',
            ]);
        }

        AuditsActions::log('user.created', 'users', $request->user(), ['user_id' => $user->id]);

        return response()->json([
            'message' => 'User created.',
            'data' => new UserResource($user->load(['profile', 'roles'])),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::query()->findOrFail($id);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'account_status' => ['sometimes', Rule::in(['active', 'suspended', 'pending'])],
            'roles' => ['sometimes', 'array'],
            'roles.*' => [Rule::in(['admin', 'buyer', 'supplier', 'investor'])],
            'company_name' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:100'],
            'dept' => ['nullable', 'string', 'max:100'],
        ]);

        $user->fill(collect($data)->only(['name', 'phone', 'account_status'])->all())->save();

        if (isset($data['roles'])) {
            if (in_array('supplier', $data['roles'], true) && ! SupplierModule::enabled()) {
                return response()->json(['message' => SupplierModule::disabledMessage()], 403);
            }

            if (in_array('investor', $data['roles'], true) && ! InvestmentModule::enabled()) {
                return response()->json(['message' => InvestmentModule::disabledMessage()], 403);
            }

            $user->syncRoles($data['roles']);
        }

        $profileData = collect($data)->only(['company_name', 'country', 'dept'])->all();
        if ($profileData !== []) {
            $user->profile()->updateOrCreate(['user_id' => $user->id], $profileData);
        }

        AuditsActions::log('user.updated', 'users', $request->user(), ['user_id' => $user->id]);

        return response()->json([
            'message' => 'User updated.',
            'data' => new UserResource($user->fresh()->load(['profile', 'roles'])),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = User::query()->findOrFail($id);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot delete yourself.'], 422);
        }

        if ($user->hasRole('admin')) {
            return response()->json(['message' => 'Cannot delete admin users.'], 422);
        }

        $deletedId = $user->id;

        DB::transaction(function () use ($user) {
            $user->syncRoles([]);
            $user->tokens()->delete();
            $user->delete();
        });

        AuditsActions::log('user.deleted', 'users', $request->user(), ['user_id' => $deletedId]);

        return response()->json(['message' => 'User deleted.']);
    }
}
