<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\PostulanteController;
use App\Http\Controllers\PagoController;
use App\Http\Controllers\DocenteController;
use App\Http\Controllers\GrupoController;
use App\Http\Controllers\SimulacroController;
use App\Http\Controllers\EvaluacionController;
use App\Http\Controllers\ReporteController;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\NotificacionController;
use App\Http\Controllers\AsignacionCarreraController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rutas Publicas (sin autenticacion)
|--------------------------------------------------------------------------
*/
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

// Registro y verificacion (acceso publico para formulario de preinscripcion)
Route::post('/postulantes', [PostulanteController::class, 'store']);
Route::get('/postulantes/buscar-ci', [PostulanteController::class, 'buscarPorCi']);
Route::post('/postulantes/{postulante}/verificar', [PostulanteController::class, 'verificarRequisitos']);
Route::post('/postulantes/delete-by-email', [PostulanteController::class, 'deleteByEmail']); // CU05 - Paso Alternativo: Eliminar registro por email para reintento

// Pago Stripe
Route::post('/postulantes/{postulante}/pago', [PagoController::class, 'crearSesion']);
Route::post('/stripe/webhook', [PagoController::class, 'webhook']);
Route::post('/pagos/verificar', [PagoController::class, 'verificarPago']);

// Chatbot (Público)
Route::post('/chatbot/pregunta', [ChatbotController::class, 'pregunta']);

// Diagnóstico (solo para debug)
Route::get('/diagnostico', function () {
    return response()->json([
        'stripe_configured' => !empty(env('STRIPE_SECRET_KEY')),
        'stripe_secret_key' => substr(env('STRIPE_SECRET_KEY'), 0, 20) . '...',
        'mail_configured' => env('MAIL_MAILER') === 'smtp',
        'mail_from' => env('MAIL_FROM_ADDRESS'),
        'api_url' => config('app.url'),
        'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),
        'environment' => app()->environment(),
    ]);
});

/*
|--------------------------------------------------------------------------
| Rutas Protegidas (requieren token Sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/postulantes/{postulante}', [PostulanteController::class, 'show']);

    // Notificaciones comunes
    Route::get('/notificaciones', [NotificacionController::class, 'index']);
    Route::post('/notificaciones/{id}/leer', [NotificacionController::class, 'marcarLeida']);

    // Solo Administrador
    Route::middleware('role:Administrador')->group(function () {
        Route::apiResource('users', UserController::class);

        // Evaluaciones (Carga, individuales, globales)
        Route::post('/evaluaciones/nota-individual', [EvaluacionController::class, 'update']);
        Route::post('/evaluaciones/cargar-masiva', [EvaluacionController::class, 'storeMasivo']);
        Route::post('/evaluaciones/calcular-promedios-global', [EvaluacionController::class, 'calcularPromediosGlobal']);
        Route::post('/evaluaciones/evaluar-estados-global', [EvaluacionController::class, 'determinarEstadosGlobal']);

        // Configuración de cupos
        Route::post('/cupos', [ReporteController::class, 'configurarCupos']);
    });

    // Busqueda y consulta (solo admin/coordinador/docente)
    Route::middleware('role:Administrador,Coordinador,Docente')->group(function () {
        Route::get('/postulantes', [PostulanteController::class, 'index']);

        // Planilla de Notas
        Route::get('/evaluaciones/planilla', [EvaluacionController::class, 'getPlanillaNotas']);

        // Dashboard estadístico
        Route::get('/dashboard/estadisticas', [ReporteController::class, 'getEstadisticas']);

        // Procesar admisiones
        Route::post('/admisiones/procesar', [AsignacionCarreraController::class, 'asignacionMasiva']);

        // Reportes
        Route::get('/reportes/estructurado', [ReporteController::class, 'generarEstructurado']);
        Route::post('/reportes/dinamico', [ReporteController::class, 'generarDinamico']);
        Route::post('/reportes/comando-voz', [ReporteController::class, 'procesarVoz']);

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

    // Rutas de Simulacro (CU23) - Solo rol Postulante
    Route::middleware('role:Postulante')->group(function () {
        Route::get('/simulacro/generar', [SimulacroController::class, 'generar']);
        Route::post('/simulacro/calificar', [SimulacroController::class, 'calificar']);
    });
});
