<?php

namespace App\Http\Controllers;

use App\Models\AuditoriaNota;
use App\Models\Examen;
use App\Models\Materia;
use App\Models\NotaFinal;
use App\Models\Postulante;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EvaluacionController extends Controller
{
    /**
     * CU13: Registrar Notas (Individual)
     *
     * Seq_CU13: ModificarNota(postulanteId, materiaId, numeroExamen, nuevaNota)
     *   → CTR_Evaluacion.update(request)
     *   → CE_Examen.update(nuevaNota)
     *   → CTR_Evaluacion.RecalcularPromedio()
     *   → CE_NotaFinal.update(promedio)
     *   → CE_AuditoriaNotas.create(log)
     *   → RetornarExito()
     */
    public function update(Request $request): JsonResponse
    {
        // CU13 - Paso 1: Act -> B_Int : + ModificarNota(postulanteId, materiaId, numeroExamen, nuevaNota)
        // CU13 - Paso 2: B_Int -> C_Ctrl : + update(request)
        $validated = $request->validate([
            'postulante_id' => 'required|exists:postulantes,id',
            'materia_id' => 'required|exists:materias,id',
            'numero_examen' => 'required|in:1,2,3',
            'nota' => 'required|numeric|between:0,100',
            'motivo' => 'required|string|max:255',
        ]);

        $user = $request->user();

        // CU13 Excepción E2: Examen ya calificado
        $examen = Examen::where('postulante_id', $validated['postulante_id'])
            ->where('materia_id', $validated['materia_id'])
            ->where('numero_examen', $validated['numero_examen'])
            ->first();

        $esEdicion = $request->boolean('es_edicion');

        if ($examen && !$esEdicion) {
            return response()->json([
                'message' => 'Este examen ya fue registrado. Use la función de edición para modificarlo.',
            ], 422);
        }

        $notaAnterior = $examen ? $examen->nota : null;

        $result = DB::transaction(function () use ($validated, $user, $notaAnterior) {
            // CU13 - Paso 3: C_Ctrl -> E_Exam : + update(nuevaNota)
            $examenGuardado = Examen::updateOrCreate(
                [
                    'postulante_id' => $validated['postulante_id'],
                    'materia_id' => $validated['materia_id'],
                    'numero_examen' => $validated['numero_examen'],
                ],
                [
                    'nota' => $validated['nota'],
                ]
            );

            // CU13 - Paso 4: C_Ctrl -> C_Ctrl : + RecalcularPromedio()
            $resultadoPromedio = $this->calcularPromedioMateria($validated['postulante_id'], $validated['materia_id']);

            // CU13 - Paso 5: C_Ctrl -> E_Nota : + update(promedio)
            NotaFinal::updateOrCreate(
                [
                    'postulante_id' => $validated['postulante_id'],
                    'materia_id' => $validated['materia_id'],
                ],
                [
                    'promedio' => $resultadoPromedio['promedio'],
                    'estado' => $resultadoPromedio['promedio'] >= 60 ? 'APROBADO' : 'REPROBADO',
                    'observaciones' => $resultadoPromedio['observaciones'],
                ]
            );

            // Recalcular estado global del postulante en tiempo real (CU16 en tiempo real)
            $this->actualizarEstadoDeUnPostulante($validated['postulante_id']);

            // CU13 - Paso 6: C_Ctrl -> E_Aud : + create(log)
            AuditoriaNota::create([
                'examen_id' => $examenGuardado->id,
                'usuario_modificador_id' => $user->id,
                'nota_anterior' => $notaAnterior,
                'nota_nueva' => $validated['nota'],
                'motivo' => $validated['motivo'],
            ]);

            return $examenGuardado;
        });

        // CU13 - Paso 7: C_Ctrl --> B_Int : + RetornarExito()
        return response()->json([
            'message' => 'Nota registrada y promedio recalculado exitosamente.',
            'examen' => $result,
        ]);
    }

    /**
     * CU14: Cargar Notas Masivamente (CSV)
     *
     * Seq_CU14: CargarArchivoCSV(file)
     *   → CTR_Evaluacion.storeMasivo(request)
     *   → CE_Postulante.where('ci', ci) → DatosPostulante
     *   → CE_Examen.create(nota)
     *   → CTR_Evaluacion.CalcularPromedioPonderado()
     *   → CE_NotaFinal.update(promedio, estado)
     *   → CE_AuditoriaNotas.create(log)
     *   → ConfirmarCargaExitosa()
     */
    public function storeMasivo(Request $request): JsonResponse
    {
        // CU14 - Paso 1: Act -> B_Nota : + CargarArchivoCSV(file)
        // CU14 - Paso 2: B_Nota -> C_Eval : + storeMasivo(request)
        $request->validate([
            'materia_id' => 'required|exists:materias,id',
            'numero_examen' => 'required|in:1,2,3',
            'file' => 'required|file|mimes:csv,txt',
        ]);

        $materiaId = $request->materia_id;
        $numeroExamen = $request->numero_examen;
        $file = $request->file('file');
        $user = $request->user();

        $rows = array_map('str_getcsv', file($file->getRealPath()));
        // Remover encabezado si existe (ej. ci,nota)
        if (count($rows) > 0 && !is_numeric($rows[0][0])) {
            array_shift($rows);
        }

        $exitos = 0;
        $errores = [];

        DB::transaction(function () use ($rows, $materiaId, $numeroExamen, $user, &$exitos, &$errores) {
            foreach ($rows as $index => $row) {
                if (count($row) < 2) {
                    $errores[] = "Línea " . ($index + 2) . ": Formato de columna inválido.";
                    continue;
                }

                $ci = trim($row[0]);
                $nota = floatval(trim($row[1]));

                if ($nota < 0 || $nota > 100) {
                    $errores[] = "Línea " . ($index + 2) . ": La nota {$nota} está fuera del rango [0-100].";
                    continue;
                }

                // CU14 - Paso 3: C_Eval -> E_Post : + where('ci', ci)
                // CU14 - Paso 4: E_Post --> C_Eval : + DatosPostulante
                $postulante = Postulante::where('ci', $ci)->first();

                if (!$postulante) {
                    $errores[] = "CI {$ci} no encontrado en el sistema de postulantes.";
                    continue;
                }

                // CU14 Excepción E2: Omitir duplicados
                $examenPrevio = Examen::where('postulante_id', $postulante->id)
                    ->where('materia_id', $materiaId)
                    ->where('numero_examen', $numeroExamen)
                    ->first();

                if ($examenPrevio) {
                    $errores[] = "Línea " . ($index + 2) . ": Se detectaron notas duplicadas para el CI {$ci} que serán omitidas.";
                    continue;
                }

                // CU14 - Paso 5: C_Eval -> E_Exam : + create(nota)
                $examen = Examen::create([
                    'postulante_id' => $postulante->id,
                    'materia_id' => $materiaId,
                    'numero_examen' => $numeroExamen,
                    'nota' => $nota,
                ]);

                // CU14 - Paso 6: C_Eval -> C_Eval : + CalcularPromedioPonderado()
                $resultadoPromedio = $this->calcularPromedioMateria($postulante->id, $materiaId);

                // CU14 - Paso 7: C_Eval -> E_Nota : + update(promedio, estado)
                NotaFinal::updateOrCreate(
                    [
                        'postulante_id' => $postulante->id,
                        'materia_id' => $materiaId,
                    ],
                    [
                        'promedio' => $resultadoPromedio['promedio'],
                        'estado' => $resultadoPromedio['promedio'] >= 60 ? 'APROBADO' : 'REPROBADO',
                        'observaciones' => $resultadoPromedio['observaciones'],
                    ]
                );

                // Recalcular estado global del postulante en tiempo real (CU16 en tiempo real)
                $this->actualizarEstadoDeUnPostulante($postulante->id);

                // CU14 - Paso 8: C_Eval -> E_Aud : + create(log)
                AuditoriaNota::create([
                    'examen_id' => $examen->id,
                    'usuario_modificador_id' => $user->id,
                    'nota_anterior' => null, // Ya validamos que es nuevo registro
                    'nota_nueva' => $nota,
                    'motivo' => 'Carga masiva CSV',
                ]);

                $exitos++;
            }
        });

        // CU14 - Paso 9: C_Eval --> B_Nota : + ConfirmarCargaExitosa(resumen)
        return response()->json([
            'message' => 'Procesamiento masivo finalizado.',
            'exitos' => $exitos,
            'errores' => $errores,
        ]);
    }

    /**
     * CU15: Calcular Promedio Ponderado de forma global (Consola / artisan)
     *
     * Seq_CU15: Artisan_Console → CTR_Evaluacion.calcularPromedios()
     *   → CE_Examen.where(postulante) → NotasMateria
     *   → CTR_Evaluacion.AplicarFormulaPonderacion()
     *   → CE_NotaFinal.updateOrCreate(promedio)
     */
    public function calcularPromediosGlobal(Request $request): JsonResponse
    {
        // CU15 - Paso 2: B_Console -> C_Ctrl : + calcularPromedios()
        $postulantes = Postulante::where('estado', 'En Evaluacion')->get();
        $materias = Materia::all();
        $calculados = 0;

        foreach ($postulantes as $postulante) {
            foreach ($materias as $materia) {
                // CU15 - Paso 3: C_Ctrl -> E_Exam : + where('postulante_id', id)
                // CU15 - Paso 4: E_Exam --> C_Ctrl : + NotasMateria
                // CU15 - Paso 5: C_Ctrl -> C_Ctrl : + AplicarFormulaPonderacion()
                $resultadoPromedio = $this->calcularPromedioMateria($postulante->id, $materia->id);

                // CU15 - Paso 6: C_Ctrl -> E_Nota : + updateOrCreate(promedio)
                NotaFinal::updateOrCreate(
                    [
                        'postulante_id' => $postulante->id,
                        'materia_id' => $materia->id,
                    ],
                    [
                        'promedio' => $resultadoPromedio['promedio'],
                        'estado' => $resultadoPromedio['promedio'] >= 60 ? 'APROBADO' : 'REPROBADO',
                        'observaciones' => $resultadoPromedio['observaciones'],
                    ]
                );
                $calculados++;
            }
        }

        // CU15 - Paso 7: C_Ctrl --> B_Console : + RetornarExito()
        return response()->json([
            'message' => "Promedios ponderados calculados exitosamente.",
            'total_calculados' => $calculados,
        ]);
    }

    /**
     * CU16: Determinar Estado (Aprobado/Reprobado)
     *
     * Seq_CU16: Artisan_Console → CTR_Evaluacion.evaluarEstados()
     *   → CE_NotaFinal.get() → PromediosCalculados
     *   → CTR_Evaluacion.ValidarUmbral(>=60)
     *   → CE_Postulante.update(estado)
     */
    public function determinarEstadosGlobal(Request $request): JsonResponse
    {
        // CU16 - Paso 2: B_Console -> C_Ctrl : + evaluarEstados()
        $postulantes = Postulante::whereIn('estado', ['En Evaluacion', 'Aprobado', 'Reprobado'])->get();
        $aprobados = 0;
        $reprobados = 0;

        foreach ($postulantes as $postulante) {
            $this->actualizarEstadoDeUnPostulante($postulante->id);
            
            $postulanteFresh = $postulante->fresh();
            if ($postulanteFresh->estado === 'Aprobado') {
                $aprobados++;
            } else {
                $reprobados++;
            }
        }

        // CU16 - Paso 7: C_Ctrl --> B_Console : + RetornarExito()
        return response()->json([
            'message' => 'Determinación de estados finalizada.',
            'aprobados' => $aprobados,
            'reprobados' => $reprobados,
        ]);
    }

    /**
     * Helper para actualizar el estado global de un postulante de forma atómica.
     * Evalúa que las 4 materias tengan nota final y estén aprobadas (>= 60).
     */
    private function actualizarEstadoDeUnPostulante($postulanteId): void
    {
        $postulante = Postulante::find($postulanteId);
        if (!$postulante) return;

        $materiasCount = Materia::count();
        $notasFinales = NotaFinal::with('materia')->where('postulante_id', $postulanteId)->get();

        $tieneTodasLasMaterias = $notasFinales->count() === $materiasCount;
        $aproboTodas = true;
        $materiasReprobadas = [];

        foreach ($notasFinales as $nf) {
            if ($nf->promedio < 60) {
                $aproboTodas = false;
                if ($nf->materia) {
                    $materiasReprobadas[] = $nf->materia->nombre;
                }
            }
        }

        $nuevoEstado = ($tieneTodasLasMaterias && $aproboTodas) ? 'Aprobado' : 'Reprobado';
        $estadoAnterior = $postulante->estado;

        if ($estadoAnterior === 'En Evaluacion' || $estadoAnterior !== $nuevoEstado) {
            $postulante->update(['estado' => $nuevoEstado]);

            if ($nuevoEstado === 'Aprobado') {
                \App\Models\Notificacion::create([
                    'usuario_id' => $postulante->user_id ?? 1,
                    'tipo_evento' => 'Resultado Final',
                    'mensaje' => "¡Felicidades! Has sido APROBADO en el CUP. Espera tu asignación de carrera.",
                    'estado' => 'NO_LEIDA',
                ]);
            } else {
                $nombresMaterias = count($materiasReprobadas) > 0 
                    ? implode(', ', $materiasReprobadas) 
                    : 'Aún falta evaluación completa';

                \App\Models\Notificacion::create([
                    'usuario_id' => $postulante->user_id ?? 1,
                    'tipo_evento' => 'Resultado Final',
                    'mensaje' => "El resultado de tu proceso en el CUP es REPROBADO. Materias no aprobadas: {$nombresMaterias}. Si consideras que es un error, contacta a Secretaría.",
                    'estado' => 'NO_LEIDA',
                ]);
            }
        }
    }

    /**
     * Helper para calcular el promedio ponderado de una materia para un postulante
     * Ponderaciones: Examen 1 (30%), Examen 2 (30%), Examen 3 (40%)
     */
    private function calcularPromptPonderado($postulanteId, $materiaId): float
    {
        return $this->calcularPromedioMateria($postulanteId, $materiaId);
    }

    private function calcularPromedioMateria($postulanteId, $materiaId): array
    {
        $examenes = Examen::where('postulante_id', $postulanteId)
            ->where('materia_id', $materiaId)
            ->get();

        $promedio = 0.0;
        foreach ($examenes as $exam) {
            if ($exam->numero_examen == 1) {
                $promedio += $exam->nota * 0.30;
            } elseif ($exam->numero_examen == 2) {
                $promedio += $exam->nota * 0.30;
            } elseif ($exam->numero_examen == 3) {
                $promedio += $exam->nota * 0.40;
            }
        }

        $faltantes = 3 - $examenes->count();
        $observaciones = null;
        if ($faltantes > 0) {
            $observaciones = "(Incompleto — faltan {$faltantes} exámenes)";
        }

        return [
            'promedio' => round($promedio, 2),
            'observaciones' => $observaciones,
        ];
    }

    /**
     * Obtener listado consolidado de calificaciones para la UI
     */
    public function getPlanillaNotas(Request $request): JsonResponse
    {
        $query = Postulante::whereIn('estado', ['En Evaluacion', 'Aprobado', 'Reprobado']);

        if ($request->filled('grupo_id')) {
            $grupoId = $request->grupo_id;
            $query->whereHas('asignacionGrupo', function ($q) use ($grupoId) {
                $q->where('grupo_id', $grupoId);
            });
        }

        $postulantes = $query->with(['examenes', 'notasFinales.materia'])->get();
        $materias = Materia::all();

        return response()->json([
            'postulantes' => $postulantes,
            'materias' => $materias,
        ]);
    }
}
