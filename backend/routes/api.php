<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\PostulanteController;
use App\Http\Controllers\PagoController;
use App\Http\Controllers\DocenteController;
use App\Http\Controllers\GrupoController;
use App\Http\Controllers\SimulacroController;
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
Route::post('/postulantes/{postulante}/verificar', [PostulanteController::class, 'verificarRequisitos']);

// Pago Stripe
Route::post('/postulantes/{postulante}/pago', [PagoController::class, 'crearSesion']);
Route::post('/stripe/webhook', [PagoController::class, 'webhook']);
Route::post('/pagos/verificar', [PagoController::class, 'verificarPago']);

/*
|--------------------------------------------------------------------------
| Rutas Protegidas (requieren token Sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Solo Administrador puede gestionar usuarios
    Route::middleware('role:Administrador')->group(function () {
        Route::apiResource('users', UserController::class);
    });

    // Busqueda y consulta (solo admin/coordinador)
    Route::middleware('role:Administrador,Coordinador')->group(function () {
        Route::get('/postulantes', [PostulanteController::class, 'index']);
        Route::get('/postulantes/{postulante}', [PostulanteController::class, 'show']);

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
