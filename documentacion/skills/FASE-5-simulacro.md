---
name: ficct-fase5-simulacro
description: >
  Implementa el simulacro de examen CUP: generacion de 40 preguntas aleatorias
  (10 por materia), calificacion en memoria y retorno detallado de resultados.
  CU23: Realizar Simulacro de Examen.
  Prerequisito: FASE 4 completada (materias y preguntas en BD).
  Trigger: "simulacro", "examen practica", "preguntas", "calificar", "CU23".
---

# FASE 5 — Simulacro de Examen (CU23)

> **Diagrama de secuencia base**: Seq_CU23
> **Flujo BCE**:
> Postulante → IU_Simulacro → CTR_Simulacro.generarExamen()
>   → CE_PreguntaSimulacro.seleccionAleatoria(10 x 4 materias)
>   → retornar 40 preguntas (sin respuesta correcta)
>
> Postulante responde (temporizador 90min en frontend)
>
> Postulante → IU_Simulacro → CTR_Simulacro.calificar(respuestas)
>   → LOOP: comparar cada respuesta con correcta
>   → retornar nota + detalle aciertos/errores por materia

---

## ARCHIVOS A CREAR

```
backend/app/Http/Controllers/SimulacroController.php
backend/database/seeders/PreguntasSimulacroSeeder.php
```

---

## PASO 1 — SimulacroController

Crear `backend/app/Http/Controllers/SimulacroController.php`:

```php
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
```

---

## PASO 2 — Rutas API

Agregar en `backend/routes/api.php`:

```php
use App\Http\Controllers\SimulacroController;

/*
|--------------------------------------------------------------------------
| Rutas de Simulacro (CU23)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:Postulante'])->group(function () {
    Route::get('/simulacro/generar', [SimulacroController::class, 'generar']);
    Route::post('/simulacro/calificar', [SimulacroController::class, 'calificar']);
});
```

---

## PASO 3 — Seeder de Preguntas

Crear `backend/database/seeders/PreguntasSimulacroSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Models\Materia;
use App\Models\PreguntaSimulacro;
use Illuminate\Database\Seeder;

class PreguntasSimulacroSeeder extends Seeder
{
    public function run(): void
    {
        $materias = Materia::all();

        $banco = [
            'Matematicas' => [
                ['Cual es el resultado de 2^10?', ['512', '1024', '2048', '256'], '1024'],
                ['Derivada de x^3?', ['3x', '3x^2', 'x^2', '2x^3'], '3x^2'],
                ['Integral de 2x dx?', ['x^2 + C', '2x^2 + C', 'x + C', '2 + C'], 'x^2 + C'],
                ['Raiz cuadrada de 144?', ['11', '12', '13', '14'], '12'],
                ['Seno de 90 grados?', ['0', '0.5', '1', '-1'], '1'],
                ['Limite de 1/x cuando x tiende a infinito?', ['0', '1', 'infinito', 'indefinido'], '0'],
                ['Factorial de 5?', ['60', '120', '24', '720'], '120'],
                ['Angulo recto mide?', ['45', '90', '180', '360'], '90'],
                ['Pitagoras: a=3, b=4, hipotenusa?', ['5', '6', '7', '25'], '5'],
                ['Log base 10 de 1000?', ['2', '3', '4', '10'], '3'],
                ['Suma de angulos internos de un triangulo?', ['90', '180', '270', '360'], '180'],
                ['Area de circulo radio 5?', ['25pi', '10pi', '50pi', '5pi'], '25pi'],
            ],
            'Fisica' => [
                ['Unidad de fuerza en SI?', ['Joule', 'Newton', 'Pascal', 'Watt'], 'Newton'],
                ['Velocidad de la luz (aprox)?', ['300000 km/s', '150000 km/s', '3000 km/s', '30000 km/s'], '300000 km/s'],
                ['F = m * a es la ley de?', ['Newton', 'Ohm', 'Kepler', 'Faraday'], 'Newton'],
                ['Unidad de energia?', ['Newton', 'Joule', 'Watt', 'Voltio'], 'Joule'],
                ['Aceleracion de gravedad terrestre?', ['8.9 m/s2', '9.8 m/s2', '10.8 m/s2', '7.8 m/s2'], '9.8 m/s2'],
                ['Presion = Fuerza / ?', ['Masa', 'Area', 'Volumen', 'Tiempo'], 'Area'],
                ['Potencia se mide en?', ['Joule', 'Watt', 'Newton', 'Hertz'], 'Watt'],
                ['Ley de Ohm: V = ?', ['I * R', 'I / R', 'R / I', 'I + R'], 'I * R'],
                ['Que es inercia?', ['Resistencia al movimiento', 'Tipo de energia', 'Fuerza', 'Velocidad'], 'Resistencia al movimiento'],
                ['1 km = ? metros', ['100', '1000', '10000', '10'], '1000'],
                ['Frecuencia se mide en?', ['Segundos', 'Hertz', 'Metros', 'Newton'], 'Hertz'],
                ['Trabajo = Fuerza x ?', ['Tiempo', 'Distancia', 'Masa', 'Velocidad'], 'Distancia'],
            ],
            'Quimica' => [
                ['Simbolo del sodio?', ['S', 'Na', 'So', 'Sd'], 'Na'],
                ['Numero atomico del carbono?', ['4', '6', '8', '12'], '6'],
                ['Formula del agua?', ['HO', 'H2O', 'H2O2', 'OH'], 'H2O'],
                ['Gas noble mas ligero?', ['Neon', 'Helio', 'Argon', 'Kripton'], 'Helio'],
                ['pH neutro?', ['0', '7', '14', '1'], '7'],
                ['Tabla periodica la creo?', ['Newton', 'Mendeleiev', 'Bohr', 'Dalton'], 'Mendeleiev'],
                ['Enlace ionico se forma entre?', ['No metales', 'Metal y no metal', 'Metales', 'Gases'], 'Metal y no metal'],
                ['Numero de Avogadro?', ['6.02x10^23', '3.14x10^8', '9.8x10^2', '1.6x10^-19'], '6.02x10^23'],
                ['Acido con pH menor a?', ['7', '14', '0', '10'], '7'],
                ['Elemento mas abundante en la Tierra?', ['Carbono', 'Oxigeno', 'Hidrogeno', 'Nitrogeno'], 'Oxigeno'],
                ['Sal comun formula?', ['NaOH', 'NaCl', 'KCl', 'CaCl'], 'NaCl'],
                ['Estado de la materia a temperatura ambiente del mercurio?', ['Solido', 'Liquido', 'Gas', 'Plasma'], 'Liquido'],
            ],
            'Lenguaje' => [
                ['Sujeto y predicado forman una?', ['Oracion', 'Parrafo', 'Texto', 'Silaba'], 'Oracion'],
                ['Sinonimo de "efimero"?', ['Eterno', 'Pasajero', 'Solido', 'Grande'], 'Pasajero'],
                ['Antonimo de "benevolo"?', ['Generoso', 'Malvado', 'Amable', 'Cruel'], 'Cruel'],
                ['Verbo en preterito de "cantar", yo?', ['Canto', 'Cante', 'Cantare', 'Cantaba'], 'Cante'],
                ['Tipo de palabra: "rapidamente"?', ['Adjetivo', 'Sustantivo', 'Adverbio', 'Verbo'], 'Adverbio'],
                ['Genero literario de "El Quijote"?', ['Lirico', 'Narrativo', 'Dramatico', 'Ensayo'], 'Narrativo'],
                ['Figura literaria: "sus ojos son soles"?', ['Simil', 'Metafora', 'Hiperbole', 'Anafora'], 'Metafora'],
                ['Silaba tonica de "telefono"?', ['te', 'le', 'fo', 'no'], 'le'],
                ['Palabra aguda lleva tilde cuando termina en?', ['Consonante', 'N, S o vocal', 'Vocal cerrada', 'Cualquier vocal'], 'N, S o vocal'],
                ['Que es un diptongo?', ['Dos vocales fuertes juntas', 'Vocal fuerte + debil en misma silaba', 'Tres vocales juntas', 'Vocal sola'], 'Vocal fuerte + debil en misma silaba'],
                ['Sujeto de: "El gato duerme"?', ['duerme', 'El gato', 'gato', 'El'], 'El gato'],
                ['Plural de "analisis"?', ['Analisises', 'Analisis', 'Analisiss', 'Analises'], 'Analisis'],
            ],
        ];

        foreach ($materias as $materia) {
            $preguntas = $banco[$materia->nombre] ?? [];
            foreach ($preguntas as $data) {
                PreguntaSimulacro::create([
                    'materia_id' => $materia->id,
                    'enunciado' => $data[0],
                    'opciones' => json_encode($data[1]),
                    'respuesta_correcta' => $data[2],
                ]);
            }
        }
    }
}
```

Registrar en `DatabaseSeeder.php`:

```php
$this->call(PreguntasSimulacroSeeder::class);
```

---

## PASO 4 — Verificar

```bash
php artisan migrate:fresh --seed
php artisan serve
```

### Tests PowerShell:

```powershell
# Login como postulante
$login = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/login" -Method POST -ContentType "application/json" -Body '{"email":"postulante@gmail.com","password":"Post2026!"}'
$token = $login.token

# Generar simulacro
$simulacro = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/simulacro/generar" -Headers @{Authorization="Bearer $token"}
Write-Host "Total preguntas: $($simulacro.simulacro.total_preguntas)"

# Calificar (responder las primeras 5 preguntas)
$respuestas = $simulacro.preguntas[0..4] | ForEach-Object {
    @{pregunta_id=$_.id; respuesta=$_.opciones[0]}
}
$body = @{respuestas=$respuestas} | ConvertTo-Json -Depth 3
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/simulacro/calificar" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body $body
```

---

## CRITERIO DE ACEPTACION

- [ ] `GET /simulacro/generar` retorna 40 preguntas (10 x 4 materias)
- [ ] Las preguntas NO contienen `respuesta_correcta` en la respuesta
- [ ] `POST /simulacro/calificar` retorna nota, aciertos, errores
- [ ] Resultado incluye desglose por materia con porcentaje
- [ ] Resultado incluye detalle de cada pregunta con respuesta correcta
- [ ] Solo role "Postulante" puede acceder (otros roles → 403)
- [ ] Resultado NO se persiste en BD (solo memoria)
- [ ] Seeder crea 12+ preguntas por materia
