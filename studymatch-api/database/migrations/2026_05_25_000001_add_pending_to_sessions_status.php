<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE tutor_sessions MODIFY COLUMN status ENUM('pending','scheduled','ongoing','completed','cancelled') DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE tutor_sessions MODIFY COLUMN status ENUM('scheduled','ongoing','completed','cancelled') DEFAULT 'scheduled'");
    }
};
