<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Announcement extends Model
{
    use HasFactory;

    protected $fillable = [
        'created_by', 'title', 'content', 'status',
        'target', 'is_pinned', 'published_at', 'expires_at',
    ];

    protected $casts = [
        'is_pinned'    => 'boolean',
        'published_at' => 'datetime',
        'expires_at'   => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();

        // Fan out notifications the first time an announcement goes published.
        static::created(function (Announcement $ann) {
            if ($ann->status === 'published') {
                $ann->fanOutNotifications();
            }
        });

        static::updated(function (Announcement $ann) {
            $wasPublished = $ann->getOriginal('status') === 'published';
            if ($ann->status === 'published' && !$wasPublished) {
                $ann->fanOutNotifications();
            }
        });
    }

    // ── Scopes ────────────────────────────────────────────────────

    public function scopePublished($query)
    {
        return $query->where('status', 'published')
                     ->where(fn($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
    }

    public function scopeForRole($query, string $role)
    {
        $target = $role === 'student' ? 'students' : 'tutors';
        return $query->where(fn($q) => $q->where('target', 'all')->orWhere('target', $target));
    }

    // ── Relations ─────────────────────────────────────────────────

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ── Notification fan-out ──────────────────────────────────────

    public function fanOutNotifications(): void
    {
        $query = User::whereNotIn('role', ['admin', 'super_admin']);

        if ($this->target === 'students') {
            $query->where('role', 'student');
        } elseif ($this->target === 'tutors') {
            $query->where('role', 'tutor');
        }

        $now     = now();
        $message = Str::limit($this->content, 100);

        $rows = $query->pluck('id')->map(fn ($uid) => [
            'user_id'    => $uid,
            'type'       => 'announcement',
            'title'      => $this->title,
            'message'    => $message,
            'data'       => json_encode(['announcement_id' => $this->id]),
            'is_read'    => 0,
            'read_at'    => null,
            'created_at' => $now,
            'updated_at' => $now,
        ])->toArray();

        if (!empty($rows)) {
            Notification::insert($rows);
        }
    }
}
