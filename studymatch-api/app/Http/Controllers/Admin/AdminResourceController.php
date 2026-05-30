<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Resource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AdminResourceController extends Controller
{
    public function index(Request $request)
    {
        $query = Resource::with(['uploader', 'subject']);

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'LIKE', "%{$request->search}%")
                  ->orWhereHas('uploader', fn ($u) => $u->where('name', 'LIKE', "%{$request->search}%"));
            });
        }

        if ($request->filled('type')) {
            $query->where('file_type', 'LIKE', "%{$request->type}%");
        }

        $resources = $query->latest()->paginate((int) $request->input('per_page', 20));

        return response()->json($resources);
    }

    public function destroy(int $id)
    {
        $resource = Resource::findOrFail($id);

        AuditLog::record('delete', 'system', "Admin deleted resource: {$resource->title}", ['resource_id' => $id]);

        Storage::delete($resource->file_path);
        $resource->delete();

        return response()->json(['message' => 'Resource deleted.']);
    }
}
