---
name: ficct-fase3-postulantes-pagos
description: >
  Implementa el flujo completo de postulantes: registro, deteccion recurrente,
  verificacion SEGIP/SEDUCA (mock), pago Stripe, y busqueda avanzada.
  CU05: Registrar Postulante, CU06: Verificar Requisitos, CU07: Pagar Inscripcion,
  CU08: Detectar Recurrente, CU09: Buscar Postulantes.
  Prerequisito: FASE 2 completada (AuthController, UserController, rutas basicas).
  Trigger: "postulantes", "inscripcion", "pago", "stripe", "verificar", "recurrente",
  "CU05", "CU06", "CU07", "CU08", "CU09".
---

# FASE 3 — Postulantes y Pagos (CU05 + CU06 + CU07 + CU08 + CU09)

> **Diagramas de secuencia base**: Seq_CU05, Seq_CU06, Seq_CU07, Seq_CU08, Seq_CU09
> **Flujo BCE**:
> - CU05: Postulante → IU_Preinscripcion → CTR_Preinscripcion → CE_Postulante
> - CU06: Sistema → CTR_Preinscripcion → API_SEGIP/SEDUCA → CE_RequisitoDocumental
> - CU07: Postulante → IU_Inscripcion → CTR_Inscripcion → Stripe → CE_Pago
> - CU08: Postulante → CTR_Preinscripcion → CE_Postulante (busca existente por CI)
> - CU09: Admin → IU_Busqueda → CTR_Busqueda → CE_Postulante

---

## ARCHIVOS A CREAR

```
backend/app/Http/Controllers/PostulanteController.php
backend/app/Http/Controllers/PagoController.php
backend/app/Services/VerificacionExternaService.php
backend/database/seeders/CatalogosSeeder.php
```

---

## PASO 1 — Instalar Stripe PHP SDK

```bash
cd backend
composer require stripe/stripe-php
```

---

## PASO 2 — Servicio de Verificacion Externa (Mock SEGIP/SEDUCA)

Crear `backend/app/Services/VerificacionExternaService.php`:

```php
<?php

namespace App\Services;

/**
 * Mock de servicios externos SEGIP y SEDUCA.
 * En produccion se reemplaza con HTTP requests reales.
 *
 * SEGIP: Verificar identidad del ciudadano por CI + fecha nacimiento
 * SEDUCA: Verificar titulo de bachiller por CI
 */
class VerificacionExternaService
{
    public function verificarSEGIP(string $ci, string $fechaNacimiento): array
    {
        // Mock: CI con 7+ digitos = valido
        $valido = strlen(preg_replace('/\D/', '', $ci)) >= 7;

        return [
            'verificado' => $valido,
            'fuente' => 'SEGIP_MOCK',
            'mensaje' => $valido ? 'Identidad verificada.' : 'CI no encontrado en SEGIP.',
        ];
    }

    public function verificarSEDUCA(string $ci): array
    {
        // Mock: siempre retorna bachiller valido
        return [
            'verificado' => true,
            'fuente' => 'SEDUCA_MOCK',
            'mensaje' => 'Titulo de bachiller verificado.',
        ];
    }

    public function verificarCompleto(string $ci, string $fechaNacimiento): array
    {
        $segip = $this->verificarSEGIP($ci, $fechaNacimiento);

        if (! $segip['verificado']) {
            return [
                'aprobado' => false,
                'segip' => $segip,
                'seduca' => null,
                'mensaje' => 'Verificacion fallida: identidad no confirmada en SEGIP.',
            ];
        }

        $seduca = $this->verificarSEDUCA($ci);

        return [
            'aprobado' => $segip['verificado'] && $seduca['verificado'],
            'segip' => $segip,
            'seduca' => $seduca,
            'mensaje' => $seduca['verificado']
                ? 'Verificacion completa exitosa.'
                : 'Verificacion fallida: titulo no encontrado en SEDUCA.',
        ];
    }
}
```

---

## PASO 3 — PostulanteController

Crear `backend/app/Http/Controllers/PostulanteController.php`:

```php
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
```

---

## PASO 4 — PagoController (Stripe Checkout)

Crear `backend/app/Http/Controllers/PagoController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Pago;
use App\Models\Postulante;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Stripe\Checkout\Session as StripeSession;
use Stripe\Stripe;
use Stripe\Webhook;

class PagoController extends Controller
{
    /**
     * CU07: Crear sesion de pago Stripe
     *
     * Seq_CU07: Postulante → IU_Inscripcion → CTR_Inscripcion.crearSesionPago()
     *   → verificar requisitos completos → PasarelaStripe.crearSesion()
     *   → retornar URL de checkout
     */
    public function crearSesion(Postulante $postulante): JsonResponse
    {
        if ($postulante->estado !== 'Verificado') {
            return response()->json([
                'message' => 'El postulante debe estar verificado antes de pagar. Estado actual: ' . $postulante->estado,
            ], 422);
        }

        $requisitos = $postulante->requisitos;
        if (! $requisitos || ! $requisitos->todosVerificados()) {
            return response()->json([
                'message' => 'Requisitos documentales incompletos.',
            ], 422);
        }

        // Verificar si ya tiene un pago exitoso
        $pagoExistente = $postulante->pagos()->where('estado_pago', 'Succeeded')->exists();
        if ($pagoExistente) {
            return response()->json([
                'message' => 'El postulante ya realizo el pago exitosamente.',
            ], 422);
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        $session = StripeSession::create([
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price_data' => [
                    'currency' => 'bob',
                    'product_data' => [
                        'name' => 'Matricula CUP FICCT - Gestion ' . $postulante->gestion->codigo,
                    ],
                    'unit_amount' => (int) (config('services.stripe.monto_matricula', 350) * 100),
                ],
                'quantity' => 1,
            ]],
            'mode' => 'payment',
            'success_url' => config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173'))
                . '/inscripcion/exitosa?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173'))
                . '/inscripcion/cancelada',
            'metadata' => [
                'postulante_id' => $postulante->id,
                'ci' => $postulante->ci,
            ],
        ]);

        return response()->json([
            'checkout_url' => $session->url,
            'session_id' => $session->id,
        ]);
    }

    /**
     * CU07: Webhook Stripe (confirma pago asincrono)
     *
     * Seq_CU07: Stripe → CTR_Inscripcion.webhookPago()
     *   → CE_Pago.registrar() → CE_Postulante.cambiarEstado("Inscrito")
     */
    public function webhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature');

        try {
            $event = Webhook::constructEvent(
                $payload,
                $signature,
                config('services.stripe.webhook_secret')
            );
        } catch (\Exception $e) {
            return response()->json(['error' => 'Webhook signature invalida.'], 400);
        }

        if ($event->type === 'checkout.session.completed') {
            $session = $event->data->object;
            $postulanteId = $session->metadata->postulante_id ?? null;

            if ($postulanteId) {
                Pago::create([
                    'postulante_id' => $postulanteId,
                    'stripe_checkout_id' => $session->id,
                    'monto' => $session->amount_total / 100,
                    'estado_pago' => 'Succeeded',
                ]);

                Postulante::where('id', $postulanteId)->update(['estado' => 'Inscrito']);
            }
        }

        return response()->json(['received' => true]);
    }

    /**
     * Verificar estado de pago por session_id (para frontend post-redirect)
     */
    public function verificarPago(Request $request): JsonResponse
    {
        $request->validate(['session_id' => 'required|string']);

        $pago = Pago::where('stripe_checkout_id', $request->session_id)->first();

        if (! $pago) {
            return response()->json(['pagado' => false, 'message' => 'Pago no encontrado o pendiente.']);
        }

        return response()->json([
            'pagado' => $pago->estado_pago === 'Succeeded',
            'pago' => $pago,
            'postulante' => $pago->postulante,
        ]);
    }
}
```

---

## PASO 5 — Agregar rutas a api.php

Agregar al archivo `backend/routes/api.php` DESPUES del bloque existente:

```php
use App\Http\Controllers\PostulanteController;
use App\Http\Controllers\PagoController;

/*
|--------------------------------------------------------------------------
| Rutas de Postulantes (CU05-CU09)
|--------------------------------------------------------------------------
*/

// Registro y verificacion (acceso publico para formulario de preinscripcion)
Route::post('/postulantes', [PostulanteController::class, 'store']);
Route::post('/postulantes/{postulante}/verificar', [PostulanteController::class, 'verificarRequisitos']);

// Pago Stripe
Route::post('/postulantes/{postulante}/pago', [PagoController::class, 'crearSesion']);
Route::post('/stripe/webhook', [PagoController::class, 'webhook']);
Route::post('/pagos/verificar', [PagoController::class, 'verificarPago']);

// Busqueda y consulta (solo admin/coordinador)
Route::middleware(['auth:sanctum', 'role:Administrador,Coordinador'])->group(function () {
    Route::get('/postulantes', [PostulanteController::class, 'index']);
    Route::get('/postulantes/{postulante}', [PostulanteController::class, 'show']);
});
```

**IMPORTANTE**: Excluir webhook de verificacion CSRF. En `bootstrap/app.php` dentro de `withMiddleware`:

```php
$middleware->validateCsrfTokens(except: [
    'api/stripe/webhook',
]);
```

---

## PASO 6 — Seeder de Catalogos

Crear `backend/database/seeders/CatalogosSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Models\Aula;
use App\Models\Carrera;
use App\Models\Gestion;
use App\Models\Materia;
use Illuminate\Database\Seeder;

class CatalogosSeeder extends Seeder
{
    public function run(): void
    {
        // Gestiones
        Gestion::create([
            'codigo' => '1-2026',
            'activa' => true,
            'fecha_inicio' => '2026-02-01',
            'fecha_fin' => '2026-06-30',
        ]);

        // Carreras FICCT
        $carreras = [
            ['nombre' => 'Ingenieria Informatica', 'codigo' => 'INF'],
            ['nombre' => 'Ingenieria de Sistemas', 'codigo' => 'SIS'],
            ['nombre' => 'Ingenieria en Redes y Telecomunicaciones', 'codigo' => 'RED'],
        ];
        foreach ($carreras as $c) {
            Carrera::create($c);
        }

        // Materias CUP
        $materias = [
            ['nombre' => 'Matematicas', 'codigo' => 'MAT'],
            ['nombre' => 'Fisica', 'codigo' => 'FIS'],
            ['nombre' => 'Quimica', 'codigo' => 'QUI'],
            ['nombre' => 'Lenguaje', 'codigo' => 'LEN'],
        ];
        foreach ($materias as $m) {
            Materia::create($m);
        }

        // Aulas
        for ($i = 1; $i <= 10; $i++) {
            Aula::create([
                'nombre' => "Aula {$i}0{$i}",
                'capacidad' => 70,
                'ubicacion' => 'Bloque ' . chr(64 + ceil($i / 3)),
            ]);
        }
    }
}
```

Registrar en `DatabaseSeeder.php`:

```php
public function run(): void
{
    // ... users existentes ...

    $this->call(CatalogosSeeder::class);
}
```

---

## PASO 7 — Verificar y probar

```bash
php artisan migrate:fresh --seed
php artisan serve
```

### Tests PowerShell:

```powershell
# 1. Registrar postulante nuevo (CU05)
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/postulantes" -Method POST -ContentType "application/json" -Body '{"ci":"9876543","nombres":"Maria","apellidos":"Lopez Gutierrez","fecha_nacimiento":"2007-03-15","sexo":"F","email":"maria@gmail.com","primera_opcion_id":1,"segunda_opcion_id":2,"turno_preferencia":"Manana"}'

# 2. Verificar requisitos (CU06)
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/postulantes/1/verificar" -Method POST

# 3. Registrar mismo CI otra vez (CU08 - recurrente)
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/postulantes" -Method POST -ContentType "application/json" -Body '{"ci":"9876543","nombres":"Maria","apellidos":"Lopez Gutierrez","fecha_nacimiento":"2007-03-15","sexo":"F","email":"maria@gmail.com","primera_opcion_id":2,"segunda_opcion_id":3,"turno_preferencia":"Tarde"}'

# 4. Buscar postulantes (CU09 - requiere admin token)
$login = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@ficct.uagrm.edu.bo","password":"Admin2026!"}'
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/postulantes?estado=Verificado" -Headers @{Authorization="Bearer $($login.token)"}
```

---

## CRITERIO DE ACEPTACION

- [ ] `POST /api/postulantes` registra nuevo postulante con estado "Preinscrito"
- [ ] Mismo CI en segunda llamada → detecta recurrente, marca `recurrente=true`
- [ ] `POST /api/postulantes/{id}/verificar` cambia estado a "Verificado"
- [ ] CI con menos de 7 digitos → verificacion SEGIP falla → estado no cambia
- [ ] `POST /api/postulantes/{id}/pago` requiere estado "Verificado"
- [ ] `GET /api/postulantes` requiere token admin/coordinador
- [ ] Filtros por ci, estado, carrera, turno, search funcionan
- [ ] Seeder crea gestiones, carreras, materias, aulas sin error
