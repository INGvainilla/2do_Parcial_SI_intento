<?php

namespace App\Http\Controllers;

use App\Models\Materia;
use App\Models\PreguntaSimulacro;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SimulacroController extends Controller
{
    private const PREGUNTAS_POR_MATERIA = 10;

    /**
     * CU23 - Generar simulacro de examen
     *
     * Selecciona 10 preguntas aleatorias por cada materia (4 materias = 40 preguntas).
     * NO envia la respuesta_correcta al frontend (evita trampa).
     */
    public function generar(): JsonResponse
    {
        $materias = Materia::all();

        if ($materias->count() < 4) {
            return response()->json([
                'message' => 'Configuracion incompleta: se necesitan al menos 4 materias.',
            ], 422);
        }

        $preguntas = collect();
        $materiasFaltantes = [];

        foreach ($materias as $materia) {
            $preguntasMateria = PreguntaSimulacro::where('materia_id', $materia->id)
                ->inRandomOrder()
                ->take(self::PREGUNTAS_POR_MATERIA)
                ->get();

            if ($preguntasMateria->count() < self::PREGUNTAS_POR_MATERIA) {
                $materiasFaltantes[] = "{$materia->nombre} (tiene {$preguntasMateria->count()}, necesita " . self::PREGUNTAS_POR_MATERIA . ")";
                continue;
            }

            // Mapear sin revelar respuesta_correcta
            $preguntasFormateadas = $preguntasMateria->map(function ($p) use ($materia) {
                return [
                    'id' => $p->id,
                    'materia' => $materia->nombre,
                    'materia_id' => $materia->id,
                    'enunciado' => $p->enunciado,
                    'opciones' => is_array($p->opciones) ? $p->opciones : json_decode($p->opciones, true),
                ];
            });

            $preguntas = $preguntas->merge($preguntasFormateadas);
        }

        if (! empty($materiasFaltantes)) {
            return response()->json([
                'message' => 'No hay suficientes preguntas en: ' . implode(', ', $materiasFaltantes),
            ], 422);
        }

        return response()->json([
            'simulacro' => [
                'total_preguntas' => $preguntas->count(),
                'tiempo_limite_minutos' => 90,
                'materias' => $materias->pluck('nombre'),
                'preguntas_por_materia' => self::PREGUNTAS_POR_MATERIA,
            ],
            'preguntas' => $preguntas->shuffle()->values(),
        ]);
    }

    /**
     * CU23 - Calificar simulacro
     *
     * Recibe respuestas del postulante, compara con BD, calcula nota.
     * La calificacion es IN-MEMORY (no persiste resultado, es solo practica).
     */
    public function calificar(Request $request): JsonResponse
    {
        $request->validate([
            'respuestas' => 'required|array|min:1|max:40',
            'respuestas.*.pregunta_id' => 'required|integer|exists:preguntas_simulacro,id',
            'respuestas.*.respuesta' => 'required|string',
        ]);

        $respuestasUsuario = collect($request->respuestas);
        $preguntaIds = $respuestasUsuario->pluck('pregunta_id')->unique();

        $preguntasDB = PreguntaSimulacro::whereIn('id', $preguntaIds)
            ->with('materia')
            ->get()
            ->keyBy('id');

        $aciertos = 0;
        $errores = 0;
        $sinResponder = 0;
        $detalle = [];
        $porMateria = [];

        foreach ($respuestasUsuario as $respuesta) {
            $pregunta = $preguntasDB->get($respuesta['pregunta_id']);
            if (! $pregunta) continue;

            $materiaName = $pregunta->materia->nombre;
            $esCorrecta = mb_strtolower(trim($respuesta['respuesta'])) === mb_strtolower(trim($pregunta->respuesta_correcta));

            if ($esCorrecta) {
                $aciertos++;
            } else {
                $errores++;
            }

            // Acumular por materia
            if (! isset($porMateria[$materiaName])) {
                $porMateria[$materiaName] = ['aciertos' => 0, 'total' => 0];
            }
            $porMateria[$materiaName]['total']++;
            if ($esCorrecta) {
                $porMateria[$materiaName]['aciertos']++;
            }

            $detalle[] = [
                'pregunta_id' => $pregunta->id,
                'materia' => $materiaName,
                'enunciado' => $pregunta->enunciado,
                'tu_respuesta' => $respuesta['respuesta'],
                'respuesta_correcta' => $pregunta->respuesta_correcta,
                'correcta' => $esCorrecta,
            ];
        }

        $total = $aciertos + $errores;
        $nota = $total > 0 ? round(($aciertos / $total) * 100, 2) : 0;

        // Calcular porcentaje por materia
        $resultadosPorMateria = [];
        foreach ($porMateria as $materia => $datos) {
            $resultadosPorMateria[] = [
                'materia' => $materia,
                'aciertos' => $datos['aciertos'],
                'total' => $datos['total'],
                'porcentaje' => $datos['total'] > 0
                    ? round(($datos['aciertos'] / $datos['total']) * 100, 1) : 0,
            ];
        }

        return response()->json([
            'resultado' => [
                'nota_sobre_100' => $nota,
                'aciertos' => $aciertos,
                'errores' => $errores,
                'total_respondidas' => $total,
                'aprobado' => $nota >= 51,
            ],
            'por_materia' => $resultadosPorMateria,
            'detalle' => $detalle,
        ]);
    }
}
