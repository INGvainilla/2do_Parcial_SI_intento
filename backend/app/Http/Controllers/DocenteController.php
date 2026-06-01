<?php

namespace App\Http\Controllers;

use App\Models\AsignacionDocente;
use App\Models\Docente;
use App\Models\Materia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocenteController extends Controller
{
    /**
     * Listar docentes con carga actual
     */
    public function index(): JsonResponse
    {
        $docentes = Docente::withCount('asignaciones as carga_actual')
            ->orderBy('apellidos')
            ->get();

        return response()->json($docentes);
    }

    /**
     * Registrar nuevo docente
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ci' => 'required|string|unique:docentes,ci',
            'nombres' => 'required|string|max:150',
            'apellidos' => 'required|string|max:150',
            'especialidad' => 'required|string|max:100',
            'grado_academico' => 'required|string|max:100',
            'correo' => 'required|email|max:150',
        ]);

        $docente = Docente::create($validated);
        return response()->json(['message' => 'Docente registrado.', 'docente' => $docente], 201);
    }

    /**
     * CU12: Asignar docente a grupo + materia
     *
     * Seq_CU12: Admin → selecciona docente, grupo, materia
     *   → CTR_Planificacion.asignarDocente()
     *   → ALT [carga < 4]: asignar | [carga >= 4]: rechazar
     *   → Validar especialidad vs materia
     *   → Validar unicidad (grupo, materia)
     */
    public function asignar(Request $request): JsonResponse
    {
        $request->validate([
            'docente_id' => 'required|exists:docentes,id',
            'grupo_id' => 'required|exists:grupos,id',
            'materia_id' => 'required|exists:materias,id',
        ]);

        $docente = Docente::findOrFail($request->docente_id);
        $materia = Materia::findOrFail($request->materia_id);

        // Validar carga maxima (4 grupos por docente)
        if (! $docente->tieneCargaDisponible()) {
            return response()->json([
                'message' => "El docente {$docente->nombres} {$docente->apellidos} ya tiene 4 grupos asignados (carga maxima).",
            ], 422);
        }

        // Validar especialidad docente vs materia (string matching flexible)
        $especialidadNorm = mb_strtolower($docente->especialidad);
        $materiaNorm = mb_strtolower($materia->nombre);
        if (strpos($especialidadNorm, $materiaNorm) === false && strpos($materiaNorm, $especialidadNorm) === false) {
            return response()->json([
                'message' => "Especialidad del docente ({$docente->especialidad}) no coincide con la materia ({$materia->nombre}).",
            ], 422);
        }

        // Validar que no exista ya un docente asignado a esa materia en ese grupo
        $duplicado = AsignacionDocente::where('grupo_id', $request->grupo_id)
            ->where('materia_id', $request->materia_id)
            ->exists();

        if ($duplicado) {
            return response()->json([
                'message' => 'Ya existe un docente asignado a esta materia en este grupo.',
            ], 422);
        }

        $asignacion = AsignacionDocente::create([
            'docente_id' => $request->docente_id,
            'grupo_id' => $request->grupo_id,
            'materia_id' => $request->materia_id,
        ]);

        return response()->json([
            'message' => 'Docente asignado exitosamente.',
            'asignacion' => $asignacion->load(['docente', 'grupo', 'materia']),
        ], 201);
    }

    /**
     * Ver docente con sus asignaciones
     */
    public function show(Docente $docente): JsonResponse
    {
        return response()->json(
            $docente->load('asignaciones.grupo', 'asignaciones.materia')
        );
    }
}
