<?php

namespace App\Http\Controllers;

use App\Models\Admision;
use App\Models\BitacoraAcceso;
use App\Models\CupoGestion;
use App\Models\Postulante;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AsignacionCarreraController extends Controller
{
    /**
     * CU17: Asignar Carreras por Cupo
     */
    public function asignacionMasiva(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $result = DB::transaction(function () use ($user) {
            // Obtener postulantes Aprobados o Pendientes de Reasignación
            $postulantes = Postulante::with(['notasFinales'])->whereIn('estado', ['Aprobado', 'Pendiente Reasignacion'])->get();

            // Calcular promedio general de cada uno y ordenar descendentemente (Meritocracia)
            $postulantes = $postulantes->map(function ($postulante) {
                $promedioGeneral = $postulante->notasFinales->avg('promedio') ?? 0;
                $postulante->promedio_general = $promedioGeneral;
                return $postulante;
            })->sortByDesc('promedio_general');

            $estadisticas = [
                'procesados' => 0,
                'admitidos_1ra_opcion' => 0,
                'admitidos_2da_opcion' => 0,
                'pendientes_reasignacion' => 0,
            ];

            foreach ($postulantes as $postulante) {
                $estadisticas['procesados']++;

                // 1ra Opcion
                $cupo1ra = CupoGestion::where('gestion_id', $postulante->gestion_id)
                    ->where('carrera_id', $postulante->primera_opcion_id)
                    ->lockForUpdate()
                    ->first();

                if ($cupo1ra && $cupo1ra->cupos_disponibles > 0) {
                    Admision::create([
                        'postulante_id' => $postulante->id,
                        'carrera_id' => $postulante->primera_opcion_id,
                        'via' => '1ra Opcion',
                        'fecha_admision' => now(),
                    ]);
                    $cupo1ra->decrement('cupos_disponibles');
                    Postulante::where('id', $postulante->id)->update(['estado' => 'Admitido']);
                    $estadisticas['admitidos_1ra_opcion']++;
                    continue;
                }

                // 2da Opcion
                $cupo2da = CupoGestion::where('gestion_id', $postulante->gestion_id)
                    ->where('carrera_id', $postulante->segunda_opcion_id)
                    ->lockForUpdate()
                    ->first();

                if ($cupo2da && $cupo2da->cupos_disponibles > 0) {
                    Admision::create([
                        'postulante_id' => $postulante->id,
                        'carrera_id' => $postulante->segunda_opcion_id,
                        'via' => '2da Opcion',
                        'fecha_admision' => now(),
                    ]);
                    $cupo2da->decrement('cupos_disponibles');
                    Postulante::where('id', $postulante->id)->update(['estado' => 'Admitido']);
                    $estadisticas['admitidos_2da_opcion']++;
                    continue;
                }

                // Sin cupo
                Postulante::where('id', $postulante->id)->update(['estado' => 'Pendiente Reasignacion']);
                $estadisticas['pendientes_reasignacion']++;

                 BitacoraAcceso::create([
                     'user_id' => $user ? $user->id : 1,
                     'ip_address' => request()->ip() ?? '127.0.0.1',
                     'action' => "Asignación Fallida - Postulante CI {$postulante->ci} sin cupo",
                 ]);
            }

            return $estadisticas;
        });

        return response()->json([
            'message' => 'Asignación masiva finalizada con éxito.',
            'estadisticas' => $result,
        ]);
    }
}
