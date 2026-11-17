<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Controller;
use App\Models\InvestorPushToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushTokenController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'expo_push_token' => [
                'required',
                'string',
                'min:20',
                'max:256',
                'regex:/^Expo(nent)?PushToken\[[A-Za-z0-9._-]+\]$/',
            ],
            'platform' => ['required', 'string', 'in:ios,android'],
        ]);

        InvestorPushToken::query()->updateOrCreate(
            ['expo_push_token' => $validated['expo_push_token']],
            [
                'user_id' => $request->user()->id,
                'platform' => $validated['platform'],
                'revoked_at' => null,
            ],
        );

        return response()->json(['success' => true]);
    }

    public function revoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'expo_push_token' => [
                'required',
                'string',
                'min:20',
                'max:256',
                'regex:/^Expo(nent)?PushToken\[[A-Za-z0-9._-]+\]$/',
            ],
        ]);

        $revoked = InvestorPushToken::query()
            ->where('user_id', $request->user()->id)
            ->where('expo_push_token', $validated['expo_push_token'])
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);

        return response()->json(['success' => true, 'revoked' => $revoked > 0]);
    }
}
