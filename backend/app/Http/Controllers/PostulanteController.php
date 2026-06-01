<?php

namespace App\Http\Controllers;

use App\Models\Gestion;
use App\Models\Postulante;
use App\Models\RequisitoDocumental;
use App\Services\VerificacionExternaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PostulanteController extends Controller
{
    /**
     * CU05 + CU08: Registrar postulante (con deteccion automatica de recurrente)
     *
     * Seq_CU08: Sistema busca CI en BD → si existe, carga datos previos → marca recurrente
     * Seq_CU05: Si no existe, registra nuevo → estado "Preinscrito"
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ci' => 'required|string|min:7|max:20',
            'nombres' => 'required|string|max:150',
            'apellidos' => 'required|string|max:150',
            'fecha_nacimiento' => 'required|date|before:today',
            'sexo' => 'required|in:M,F',
            'direccion' => 'nullable|string|max:255',
            'telefono' => 'nullable|string|max:20',
            'email' => 'required|email|max:150',
            'colegio_procedencia' => 'nullable|string|max:150',
            'primera_opcion_id' => 'required|exists:carreras,id',
            'segunda_opcion_id' => 'required|exists:carreras,id|different:primera_opcion_id',
            'turno_preferencia' => 'required|in:Manana,Tarde,Noche',
        ]);

        $gestion = Gestion::activa()->first();
        if (! $gestion) {
            return response()->json([
                'message' => 'No hay periodo de inscripcion activo.',
            ], 422);
        }

        // CU08: Deteccion de postulante recurrente por CI
        $existente = Postulante::where('ci', $validated['ci'])->first();

        if ($existente) {
            // Ya participo antes → actualizar datos y marcar recurrente
            $existente->update(array_merge($validated, [
                'gestion_id' => $gestion->id,
                'estado' => 'Preinscrito',
                'recurrente' => true,
            ]));

            return response()->json([
                'message' => 'Postulante recurrente detectado. Datos actualizados para la gestion actual.',
                'postulante' => $existente->fresh()->load('primeraOpcion', 'segundaOpcion'),
                'recurrente' => true,
            ]);
        }

        // CU05: Nuevo postulante
        $postulante = Postulante::create(array_merge($validated, [
            'gestion_id' => $gestion->id,
            'estado' => 'Preinscrito',
            'recurrente' => false,
        ]));

        RequisitoDocumental::create(['postulante_id' => $postulante->id]);

        return response()->json([
            'message' => 'Preinscripcion exitosa. Proceda a la verificacion de requisitos.',
            'postulante' => $postulante->load('primeraOpcion', 'segundaOpcion'),
            'recurrente' => false,
        ], 201);
    }

    /**
     * CU06: Verificar requisitos con bases externas (SEGIP/SEDUCA)
     *
     * Seq_CU06: CTR_Preinscripcion → consulta API_SEGIP → consulta API_SEDUCA
     *   → actualiza CE_RequisitoDocumental → actualiza estado postulante
     */
    public function verificarRequisitos(Postulante $postulante): JsonResponse
    {
        if ($postulante->estado !== 'Preinscrito') {
            return response()->json([
                'message' => 'El postulante ya fue verificado previamente.',
            ], 422);
        }

        $service = new VerificacionExternaService();
        $resultado = $service->verificarCompleto(
            $postulante->ci,
            $postulante->fecha_nacimiento->format('Y-m-d')
        );

        if ($resultado['aprobado']) {
            $postulante->requisitos()->update([
                'ci_digitalizado' => true,
                'certificado_nacimiento' => true,
                'titulo_bachiller_legalizado' => true,
                'formulario_preinscripcion' => true,
                'verificado_bd_externa' => true,
            ]);
            $postulante->update(['estado' => 'Verificado']);
        }

        return response()->json([
            'message' => $resultado['mensaje'],
            'verificacion' => $resultado,
            'estado_postulante' => $postulante->fresh()->estado,
        ], $resultado['aprobado'] ? 200 : 422);
    }

    /**
     * CU09: Buscar postulantes con filtros multiples
     *
     * Seq_CU09: Admin → IU_Busqueda → CTR_Busqueda.buscar(filtros)
     *   → CE_Postulante.filtrar() → retornar listado paginado
     */
    public function index(Request $request): JsonResponse
    {
        $query = Postulante::with(['primeraOpcion', 'segundaOpcion', 'gestion']);

        if ($request->filled('ci')) {
            $query->where('ci', $request->ci);
        }
        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }
        if ($request->filled('gestion_id')) {
            $query->where('gestion_id', $request->gestion_id);
        }
        if ($request->filled('carrera_id')) {
            $id = $request->carrera_id;
            $query->where(function ($q) use ($id) {
                $q->where('primera_opcion_id', $id)
                  ->orWhere('segunda_opcion_id', $id);
            });
        }
        if ($request->filled('turno')) {
            $query->where('turno_preferencia', $request->turno);
        }
        if ($request->filled('recurrente')) {
            $query->where('recurrente', $request->boolean('recurrente'));
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nombres', 'ilike', "%{$s}%")
                  ->orWhere('apellidos', 'ilike', "%{$s}%")
                  ->orWhere('ci', 'ilike', "%{$s}%")
                  ->orWhere('email', 'ilike', "%{$s}%");
            });
        }

        return response()->json($query->orderBy('apellidos')->paginate(20));
    }

    /**
     * Ver detalle completo de un postulante
     */
    public function show(Postulante $postulante): JsonResponse
    {
        return response()->json(
            $postulante->load([
                'primeraOpcion', 'segundaOpcion', 'gestion',
                'requisitos', 'pagos', 'asignacionGrupo.grupo',
            ])
        );
    }
}
