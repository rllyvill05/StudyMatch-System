<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AdminAuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->role !== 'super_admin') {
            return response()->json(['message' => 'Access denied. Super admin credentials required for the Desktop Console.'], 403);
        }

        if ($user->suspended_at) {
            return response()->json(['message' => 'This account has been suspended.'], 403);
        }

        $token = $user->createToken('admin_token')->plainTextToken;

        AuditLog::record('login', 'auth', "Admin {$user->email} logged in", [], $user->id);

        return response()->json([
            'success' => true,
            'token'   => $token,
            'user'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        /** @var \App\Models\User $admin */
        $admin = $request->user();

        AuditLog::record('logout', 'auth', "Admin {$admin->email} logged out");

        /** @var \Laravel\Sanctum\PersonalAccessToken $token */
        $token = $admin->currentAccessToken();
        $token->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request)
    {
        return response()->json(['user' => $request->user()]);
    }
}
