<?php

namespace Database\Seeders;

use App\Models\Aula;
use App\Models\Carrera;
use App\Models\Gestion;
use App\Models\Materia;
use Illuminate\Database\Seeder;

class CatalogosSeeder extends Seeder
{
    public function run(): void
    {
        // Gestiones
        Gestion::create([
            'codigo' => '1-2026',
            'activa' => true,
            'fecha_inicio' => '2026-02-01',
            'fecha_fin' => '2026-06-30',
        ]);

        // Carreras FICCT
        $carreras = [
            ['nombre' => 'Ingenieria Informatica', 'codigo' => 'INF'],
            ['nombre' => 'Ingenieria de Sistemas', 'codigo' => 'SIS'],
            ['nombre' => 'Ingenieria en Redes y Telecomunicaciones', 'codigo' => 'RED'],
        ];
        foreach ($carreras as $c) {
            Carrera::create($c);
        }

        // Materias CUP
        $materias = [
            ['nombre' => 'Matematicas', 'codigo' => 'MAT'],
            ['nombre' => 'Fisica', 'codigo' => 'FIS'],
            ['nombre' => 'Quimica', 'codigo' => 'QUI'],
            ['nombre' => 'Lenguaje', 'codigo' => 'LEN'],
        ];
        foreach ($materias as $m) {
            Materia::create($m);
        }

        // Aulas
        for ($i = 1; $i <= 10; $i++) {
            Aula::create([
                'nombre' => "Aula {$i}0{$i}",
                'capacidad' => 70,
                'ubicacion' => 'Bloque ' . chr(64 + ceil($i / 3)),
            ]);
        }
    }
}
