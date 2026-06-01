<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Admin CUP',
            'email' => 'admin@ficct.uagrm.edu.bo',
            'password' => Hash::make('Admin2026!'),
            'role' => 'Administrador',
            'active' => true,
        ]);

        User::create([
            'name' => 'Coordinador CUP',
            'email' => 'coordinador@ficct.uagrm.edu.bo',
            'password' => Hash::make('Coord2026!'),
            'role' => 'Coordinador',
            'active' => true,
        ]);

        User::create([
            'name' => 'Docente Test',
            'email' => 'docente@ficct.uagrm.edu.bo',
            'password' => Hash::make('Docente2026!'),
            'role' => 'Docente',
            'active' => true,
        ]);

        User::create([
            'name' => 'Postulante Test',
            'email' => 'postulante@gmail.com',
            'password' => Hash::make('Post2026!'),
            'role' => 'Postulante',
            'active' => true,
        ]);

        $this->call(CatalogosSeeder::class);
        $this->call(PostulantesTestSeeder::class);
        $this->call(PreguntasSimulacroSeeder::class);
    }
}
