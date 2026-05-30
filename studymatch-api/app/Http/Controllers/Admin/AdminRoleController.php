<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;

class AdminRoleController extends Controller
{
    public function index()
    {
        return response()->json([
            'roles' => ['student', 'tutor', 'admin'],
        ]);
    }

    public function assignRole(Request $request, $userId)
    {
        $request->validate([
            'role' => 'required|in:student,tutor,admin',
        ]);

        $user = User::findOrFail($userId);
        $user->update(['role' => $request->role]);

        AuditLog::record('assign', 'roles', "Admin assigned role '{$request->role}' to {$user->name} ({$user->email})", ['user_id' => $userId, 'role' => $request->role]);

        return response()->json(['message' => "Role '{$request->role}' assigned to {$user->name}.", 'user' => $user->fresh()]);
    }

    public function revokeRole(Request $request, $userId)
    {
        $user = User::findOrFail($userId);
        $user->update(['role' => 'student']);

        AuditLog::record('revoke', 'roles', "Admin revoked role from {$user->name} ({$user->email}), reset to student", ['user_id' => $userId]);

        return response()->json(['message' => "Role revoked. User is now a student.", 'user' => $user->fresh()]);
    }
}
