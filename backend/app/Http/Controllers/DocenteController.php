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
        // CU12 - Paso 2: B_Int -> C_Ctrl : + asignar(request)
        $request->validate([
            'docente_id' => 'required|exists:docentes,id',
            'grupo_id' => 'required|exists:grupos,id',
            'materia_id' => 'required|exists:materias,id',
        ]);

        // CU12 - Paso 3: C_Ctrl -> E_Doc : + findOrFail(docente_id)
        $docente = Docente::findOrFail($request->docente_id);

        // CU12 - Paso 4: E_Doc --> C_Ctrl : + CargaHorariaValida
        // Validar carga maxima (4 grupos por docente)
        if (! $docente->tieneCargaDisponible()) {
            return response()->json([
                'message' => "El docente {$docente->nombres} {$docente->apellidos} ya tiene 4 grupos asignados (carga maxima).",
            ], 422);
        }

        // CU12 - Paso 5: C_Ctrl -> E_Grupo : + findOrFail(grupo_id)
        // CU12 - Paso 6: E_Grupo --> C_Ctrl : + DatosGrupo
        // CU12 - Paso 7: C_Ctrl -> E_Mat : + findOrFail(materia_id)
        // CU12 - Paso 8: E_Mat --> C_Ctrl : + DatosMateria
        $materia = Materia::findOrFail($request->materia_id);

        // CU12 - Paso 8.1: C_Ctrl -> C_Ctrl : + ValidarCoincidenciaEspecialidad(docente.especialidad, materia.nombre)
        // Validar especialidad docente vs materia (string matching flexible)
        $especialidadNorm = mb_strtolower($docente->especialidad);
        $materiaNorm = mb_strtolower($materia->nombre);
        if (strpos($especialidadNorm, $materiaNorm) === false && strpos($materiaNorm, $especialidadNorm) === false) {
            // E3: Especialidad no coincide
            if (!$request->boolean('confirmar_especialidad')) {
                return response()->json([
                    'requires_confirmation' => true,
                    'message' => "El docente {$docente->nombres} tiene especialidad en {$docente->especialidad} pero se le está asignando {$materia->nombre}. ¿Confirmar?",
                ], 428); // Precondition Required
            }
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

        // CU12 - Paso 9: C_Ctrl -> E_AsigDoc : + create(datos)
        $asignacion = AsignacionDocente::create([
            'docente_id' => $request->docente_id,
            'grupo_id' => $request->grupo_id,
            'materia_id' => $request->materia_id,
        ]);

        // CU12 - Paso 10: C_Ctrl --> B_Int : + RetornarExito()
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
