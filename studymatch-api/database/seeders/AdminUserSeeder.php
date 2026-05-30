<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // Basic web admin — access via studymatch-web admin panel
        User::firstOrCreate(
            ['email' => 'admin@studymatch.com'],
            [
                'name'              => 'Web Admin',
                'password'          => Hash::make('Admin@1234'),
                'role'              => 'admin',
                'email_verified_at' => now(),
                'profile_completed' => true,
            ]
        );

        // Super admin — access via studymatchadmin Desktop Console only
        User::firstOrCreate(
            ['email' => 'superadmin@studymatch.com'],
            [
                'name'              => 'Super Admin',
                'password'          => Hash::make('SuperAdmin@1234'),
                'role'              => 'super_admin',
                'email_verified_at' => now(),
                'profile_completed' => true,
            ]
        );
    }
}
