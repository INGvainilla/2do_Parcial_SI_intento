<?php

namespace Database\Seeders;

use App\Models\Docente;
use App\Models\Pago;
use App\Models\Postulante;
use App\Models\RequisitoDocumental;
use Illuminate\Database\Seeder;

class PostulantesTestSeeder extends Seeder
{
    public function run(): void
    {
        // Crear 150 postulantes inscritos (para probar 3 grupos de 70+)
        $turnos = ['Manana', 'Tarde', 'Noche'];
        for ($i = 1; $i <= 150; $i++) {
            $turno = $turnos[$i % 3];
            $p = Postulante::create([
                'ci' => '100000' . str_pad($i, 3, '0', STR_PAD_LEFT),
                'nombres' => "Nombre{$i}",
                'apellidos' => "Apellido{$i}",
                'fecha_nacimiento' => '2007-01-' . str_pad(($i % 28) + 1, 2, '0', STR_PAD_LEFT),
                'sexo' => $i % 2 === 0 ? 'F' : 'M',
                'email' => "postulante{$i}@test.com",
                'primera_opcion_id' => 1,
                'segunda_opcion_id' => 2,
                'turno_preferencia' => $turno,
                'gestion_id' => 1,
                'estado' => 'Inscrito',
            ]);
            RequisitoDocumental::create([
                'postulante_id' => $p->id,
                'ci_digitalizado' => true,
                'certificado_nacimiento' => true,
                'titulo_bachiller_legalizado' => true,
                'formulario_preinscripcion' => true,
                'verificado_bd_externa' => true,
            ]);
            Pago::create([
                'postulante_id' => $p->id,
                'stripe_checkout_id' => "cs_test_{$i}",
                'monto' => 350,
                'estado_pago' => 'Succeeded',
            ]);
        }

        // Crear docentes
        $especialidades = ['Matematicas', 'Fisica', 'Quimica', 'Lenguaje'];
        foreach ($especialidades as $idx => $esp) {
            Docente::create([
                'ci' => '500000' . ($idx + 1),
                'nombres' => "Docente {$esp}",
                'apellidos' => "Prof{$idx}",
                'especialidad' => $esp,
                'grado_academico' => 'Magister',
                'correo' => strtolower($esp) . "@ficct.edu.bo",
            ]);
        }
    }
}
