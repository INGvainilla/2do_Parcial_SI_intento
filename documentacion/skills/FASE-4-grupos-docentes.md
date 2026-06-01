---
name: ficct-fase4-grupos-docentes
description: >
  Implementa planificacion de grupos, asignacion masiva de postulantes,
  reasignacion manual y asignacion de docentes con control de carga.
  CU10: Crear Grupos Automaticamente, CU11: Reasignar Postulante,
  CU12: Asignar Docentes.
  Prerequisito: FASE 3 completada (postulantes con estado "Inscrito" existen en BD).
  Trigger: "grupos", "asignar", "docentes", "planificacion", "reasignar",
  "CU10", "CU11", "CU12".
---

# FASE 4 — Grupos y Docentes (CU10 + CU11 + CU12)

> **Diagramas de secuencia base**: Seq_CU10, Seq_CU11, Seq_CU12
> **Flujo BCE**:
> - CU10: Admin → IU_Grupos → CTR_Planificacion → LOOP[postulantes] → CE_Grupo + CE_AsignacionGrupo
> - CU11: Admin → IU_Grupos → CTR_Planificacion → CE_Grupo.verificarCapacidad() → CE_AsignacionGrupo
> - CU12: Admin → IU_Docentes → CTR_Planificacion → CE_Docente.verificarCarga() → CE_AsignacionDocente

---

## ARCHIVOS A CREAR

```
backend/app/Http/Controllers/GrupoController.php
backend/app/Http/Controllers/DocenteController.php
backend/app/Services/PlanificacionService.php
backend/database/seeders/PostulantesTestSeeder.php
```

---

## PASO 1 — PlanificacionService (logica core)

Crear `backend/app/Services/PlanificacionService.php`:

```php
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
```

---

## PASO 2 — GrupoController

Crear `backend/app/Http/Controllers/GrupoController.php`:

```php
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
```

---

## PASO 3 — DocenteController

Crear `backend/app/Http/Controllers/DocenteController.php`:

```php
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
```

---

## PASO 4 — Agregar rutas a api.php

Agregar en `backend/routes/api.php`:

```php
use App\Http\Controllers\DocenteController;
use App\Http\Controllers\GrupoController;

/*
|--------------------------------------------------------------------------
| Rutas de Grupos y Docentes (CU10-CU12)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:Administrador,Coordinador'])->group(function () {
    // Grupos
    Route::get('/grupos', [GrupoController::class, 'index']);
    Route::get('/grupos/{grupo}', [GrupoController::class, 'show']);
    Route::post('/grupos/asignacion-masiva', [GrupoController::class, 'asignacionMasiva']);
    Route::post('/grupos/reasignar', [GrupoController::class, 'reasignar']);

    // Docentes
    Route::get('/docentes', [DocenteController::class, 'index']);
    Route::post('/docentes', [DocenteController::class, 'store']);
    Route::get('/docentes/{docente}', [DocenteController::class, 'show']);
    Route::post('/docentes/asignar', [DocenteController::class, 'asignar']);
});
```

---

## PASO 5 — Seeder de prueba con postulantes inscritos

Crear `backend/database/seeders/PostulantesTestSeeder.php`:

```php
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
```

Registrar en `DatabaseSeeder.php`:

```php
$this->call(CatalogosSeeder::class);
$this->call(PostulantesTestSeeder::class);
```

---

## PASO 6 — Verificar y probar

```bash
php artisan migrate:fresh --seed
php artisan serve
```

### Tests PowerShell:

```powershell
# Login como admin
$login = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@ficct.uagrm.edu.bo","password":"Admin2026!"}'
$token = $login.token

# CU10: Asignacion masiva
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/grupos/asignacion-masiva" -Method POST -Headers @{Authorization="Bearer $token"}

# Ver grupos creados
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/grupos" -Headers @{Authorization="Bearer $token"}

# CU11: Reasignar postulante al grupo 2
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/grupos/reasignar" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"postulante_id":1,"grupo_id":2}'

# CU12: Asignar docente a grupo 1, materia Matematicas
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/docentes/asignar" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"docente_id":1,"grupo_id":1,"materia_id":1}'
```

---

## CRITERIO DE ACEPTACION

- [ ] `POST /grupos/asignacion-masiva` crea CEIL(inscritos/70) grupos por turno
- [ ] Cada postulante queda en un solo grupo (constraint UNIQUE funciona)
- [ ] Estado de postulantes cambia a "En Evaluacion" tras asignacion
- [ ] `POST /grupos/reasignar` rechaza si grupo tiene 70 estudiantes
- [ ] `POST /docentes/asignar` rechaza si docente ya tiene 4 asignaciones
- [ ] `POST /docentes/asignar` rechaza si especialidad no coincide con materia
- [ ] `POST /docentes/asignar` rechaza si ya hay docente en ese grupo+materia
- [ ] `GET /grupos` lista grupos con total_estudiantes correcto
- [ ] 150 postulantes → al menos 3 grupos creados (150/70 = 3 por turno)
