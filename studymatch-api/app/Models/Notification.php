<?php

namespace App\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'type', 'title', 'message', 'data', 'is_read', 'read_at',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopeUnread(\Illuminate\Database\Eloquent\Builder $query)
    {
        return $query->where('is_read', false);
    }

    public static function send(int $userId, string $type, string $title, string $message, array $data = []): void
    {
        static::create([
            'user_id' => $userId,
            'type'    => $type,
            'title'   => $title,
            'message' => $message,
            'data'    => !empty($data) ? json_encode($data) : null,
            'is_read' => false,
        ]);
    }

    public static function notifyAdmins(string $type, string $title, string $message, array $data = []): void
    {
        $adminIds = User::whereIn('role', ['admin', 'super_admin'])->pluck('id');
        foreach ($adminIds as $id) {
            static::send($id, $type, $title, $message, $data);
        }
    }
}
