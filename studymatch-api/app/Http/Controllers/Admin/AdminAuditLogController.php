<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AdminAuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditLog::with('admin');

        if ($request->filled('module')) {
            $query->whereRaw('LOWER(module) = ?', [strtolower($request->module)]);
        }

        if ($request->filled('action')) {
            $query->where('action', 'LIKE', "%{$request->action}%");
        }

        if ($request->filled('admin_id')) {
            $query->where('admin_id', $request->admin_id);
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        $logs = $query->latest()->paginate((int) $request->input('per_page', 50));

        return response()->json($logs);
    }
}
