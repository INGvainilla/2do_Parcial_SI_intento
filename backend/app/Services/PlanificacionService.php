<?php

namespace App\Services;

use App\Models\AsignacionGrupo;
use App\Models\Aula;
use App\Models\Grupo;
use App\Models\Postulante;
use Illuminate\Support\Facades\DB;

class PlanificacionService
{
    private const MAX_POR_GRUPO = 70;

    /**
     * CU10: Calculo automatico de grupos + asignacion masiva.
     *
     * Algoritmo del diagrama de secuencia:
     * 1. Obtener postulantes con estado "Inscrito" sin grupo asignado
     * 2. Agrupar por turno_preferencia
     * 3. Por cada turno: cantidadGrupos = CEIL(total / 70)
     * 4. Crear grupos y asignar aula
     * 5. LOOP: asignar cada postulante a un grupo → estado = "En Evaluacion"
     */
    public function ejecutarAsignacionMasiva(int $gestionId): array
    {
        return DB::transaction(function () use ($gestionId) {
            $postulantes = Postulante::where('gestion_id', $gestionId)
                ->where('estado', 'Inscrito')
                ->whereDoesntHave('asignacionGrupo')
                ->orderBy('apellidos')
                ->get();

            if ($postulantes->isEmpty()) {
                return [
                    'success' => true,
                    'message' => 'No hay postulantes inscritos pendientes de asignacion.',
                    'grupos_creados' => 0,
                    'postulantes_asignados' => 0,
                ];
            }

            $porTurno = $postulantes->groupBy('turno_preferencia');
            $gruposCreados = 0;
            $postulantesAsignados = 0;
            $aulas = Aula::where('capacidad', '>=', self::MAX_POR_GRUPO)->get();
            $aulaIndex = 0;

            foreach ($porTurno as $turno => $listaPostulantes) {
                $cantGrupos = (int) ceil($listaPostulantes->count() / self::MAX_POR_GRUPO);
                $ultimoNumero = Grupo::where('gestion_id', $gestionId)
                    ->where('turno', $turno)
                    ->max('numero') ?? 0;

                $gruposNuevos = [];
                for ($i = 1; $i <= $cantGrupos; $i++) {
                    $aula = $aulas[$aulaIndex % $aulas->count()];
                    $aulaIndex++;

                    $gruposNuevos[] = Grupo::create([
                        'numero' => $ultimoNumero + $i,
                        'gestion_id' => $gestionId,
                        'turno' => $turno,
                        'aula_id' => $aula->id,
                    ]);
                }
                $gruposCreados += $cantGrupos;

                // Distribuir equitativamente
                $chunks = $listaPostulantes->values()->chunk(self::MAX_POR_GRUPO);
                foreach ($chunks as $idx => $chunk) {
                    $grupo = $gruposNuevos[$idx];
                    foreach ($chunk as $postulante) {
                        AsignacionGrupo::create([
                            'postulante_id' => $postulante->id,
                            'grupo_id' => $grupo->id,
                        ]);
                        $postulante->update(['estado' => 'En Evaluacion']);
                        $postulantesAsignados++;
                    }
                }
            }

            return [
                'success' => true,
                'message' => 'Asignacion masiva completada exitosamente.',
                'grupos_creados' => $gruposCreados,
                'postulantes_asignados' => $postulantesAsignados,
                'detalle_por_turno' => $porTurno->map->count(),
            ];
        });
    }

    /**
     * CU11: Reasignar postulante a otro grupo.
     *
     * Diagrama: Admin selecciona postulante → selecciona nuevo grupo
     *   → ALT [capacidad < 70]: reasignar | [capacidad = 70]: rechazar
     */
    public function reasignarPostulante(int $postulanteId, int $nuevoGrupoId): array
    {
        $grupo = Grupo::findOrFail($nuevoGrupoId);

        if (! $grupo->tieneCapacidad()) {
            return [
                'success' => false,
                'message' => "Grupo #{$grupo->numero} (turno {$grupo->turno}) esta lleno. Capacidad maxima: " . self::MAX_POR_GRUPO,
            ];
        }

        AsignacionGrupo::where('postulante_id', $postulanteId)->delete();

        AsignacionGrupo::create([
            'postulante_id' => $postulanteId,
            'grupo_id' => $nuevoGrupoId,
        ]);

        return [
            'success' => true,
            'message' => "Postulante reasignado al grupo #{$grupo->numero}.",
        ];
    }
}
