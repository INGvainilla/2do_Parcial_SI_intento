<?php

namespace App\Http\Controllers;

use App\Models\Gestion;
use App\Models\Grupo;
use App\Services\PlanificacionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GrupoController extends Controller
{
    private PlanificacionService $planificacion;

    public function __construct(PlanificacionService $planificacion)
    {
        $this->planificacion = $planificacion;
    }

    /**
     * CU10: Ejecutar calculo automatico y asignacion masiva
     */
    public function asignacionMasiva(): JsonResponse
    {
        $gestion = Gestion::activa()->firstOrFail();
        $resultado = $this->planificacion->ejecutarAsignacionMasiva($gestion->id);

        return response()->json($resultado);
    }

    /**
     * CU11: Reasignar un postulante a otro grupo
     */
    public function reasignar(Request $request): JsonResponse
    {
        $request->validate([
            'postulante_id' => 'required|exists:postulantes,id',
            'grupo_id' => 'required|exists:grupos,id',
        ]);

        $resultado = $this->planificacion->reasignarPostulante(
            $request->postulante_id,
            $request->grupo_id
        );

        return response()->json($resultado, $resultado['success'] ? 200 : 422);
    }

    /**
     * Listar grupos de la gestion activa
     */
    public function index(): JsonResponse
    {
        $gestion = Gestion::activa()->first();
        if (! $gestion) {
            return response()->json(['data' => []]);
        }

        $grupos = Grupo::where('gestion_id', $gestion->id)
            ->with(['aula', 'docentes.docente', 'docentes.materia'])
            ->withCount('asignaciones as total_estudiantes')
            ->orderBy('turno')
            ->orderBy('numero')
            ->get();

        return response()->json($grupos);
    }

    /**
     * Ver detalle de un grupo con sus postulantes y docentes
     */
    public function show(Grupo $grupo): JsonResponse
    {
        return response()->json(
            $grupo->load([
                'aula',
                'asignaciones.postulante',
                'docentes.docente',
                'docentes.materia',
            ])
        );
    }
}
