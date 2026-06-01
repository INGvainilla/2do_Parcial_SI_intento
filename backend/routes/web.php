<?php

use Illuminate\Support\Facades\Route;

// Fallback para redirigir cualquier ruta web no definida (como las del frontend SPA) al index.html compilado de React
Route::fallback(function () {
    $indexPath = public_path('index.html');
    if (file_exists($indexPath)) {
        return file_get_contents($indexPath);
    }
    return response()->json([
        'message' => 'El frontend de React no ha sido compilado. Asegúrate de compilarlo antes de acceder.'
    ], 404);
});
