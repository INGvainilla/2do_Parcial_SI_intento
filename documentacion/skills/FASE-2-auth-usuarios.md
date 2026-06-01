---
name: ficct-fase2-auth-usuarios
description: >
  Implementa autenticacion completa (login, logout, recuperar contrasena) y CRUD de usuarios.
  CU01: Iniciar Sesion, CU02: Cerrar Sesion, CU03: Recuperar Contrasena, CU04: Gestionar Usuarios.
  Prerequisito: FASE 1 completada (Sanctum instalado, modelos creados, migraciones OK).
  Trigger: "auth", "login", "usuarios", "CU01", "CU02", "CU03", "CU04".
---

# FASE 2 — Autenticacion y Gestion de Usuarios (CU01 + CU02 + CU03 + CU04)

> **Diagramas de secuencia base**: Seq_CU01, Seq_CU02, Seq_CU03, Seq_CU04
> **Flujo BCE**: Actor → IU_Login/IU_Usuarios → CTR_Auth/CTR_Usuarios → CE_Usuario + CE_BitacoraAcceso

---

## ARCHIVOS A CREAR

```
backend/app/Http/Controllers/AuthController.php
backend/app/Http/Controllers/UserController.php
backend/routes/api.php (sobreescribir)
backend/database/seeders/DatabaseSeeder.php (actualizar)
```

---

## PASO 1 — AuthController (CU01 + CU02 + CU03)

Crear `backend/app/Http/Controllers/AuthController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\BitacoraAcceso;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * CU01 - Iniciar Sesion
     *
     * Diagrama: Postulante/Admin → IU_Login → CTR_Auth.login()
     *   → CE_Usuario.findByEmail() → CE_Usuario.verificarPassword()
     *   → CE_BitacoraAcceso.registrar() → generar token → retornar
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['Credenciales incorrectas.'],
            ]);
        }

        if (! $user->active) {
            return response()->json([
                'message' => 'Cuenta bloqueada. Contacte al administrador o use recuperar contrasena.',
            ], 423);
        }

        if (! Hash::check($request->password, $user->password)) {
            BitacoraAcceso::create([
                'user_id' => $user->id,
                'ip_address' => $request->ip(),
                'action' => 'LOGIN_FALLIDO',
            ]);

            $intentosFallidos = BitacoraAcceso::where('user_id', $user->id)
                ->where('action', 'LOGIN_FALLIDO')
                ->where('created_at', '>=', now()->subMinutes(15))
                ->count();

            if ($intentosFallidos >= 3) {
                $user->update(['active' => false]);
                return response()->json([
                    'message' => 'Cuenta bloqueada tras 3 intentos fallidos. Use recuperar contrasena.',
                ], 423);
            }

            throw ValidationException::withMessages([
                'email' => ['Credenciales incorrectas.'],
            ]);
        }

        $token = $user->createToken('cup-session')->plainTextToken;

        BitacoraAcceso::create([
            'user_id' => $user->id,
            'ip_address' => $request->ip(),
            'action' => 'LOGIN_EXITOSO',
        ]);

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }

    /**
     * CU02 - Cerrar Sesion
     *
     * Diagrama: Usuario → IU → CTR_Auth.logout()
     *   → invalidar token → CE_BitacoraAcceso.registrar()
     */
    public function logout(Request $request): JsonResponse
    {
        BitacoraAcceso::create([
            'user_id' => $request->user()->id,
            'ip_address' => $request->ip(),
            'action' => 'LOGOUT',
        ]);

        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesion cerrada exitosamente.']);
    }

    /**
     * CU03 - Recuperar Contrasena (enviar enlace)
     *
     * Diagrama: Usuario → IU_Login → CTR_Auth.forgotPassword()
     *   → CE_Usuario.findByEmail() → generar token temporal → enviar email
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        Password::sendResetLink($request->only('email'));

        return response()->json([
            'message' => 'Si el correo existe, recibira un enlace de recuperacion.',
        ]);
    }

    /**
     * CU03 - Restablecer Contrasena (con token)
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'active' => true,
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Contrasena actualizada exitosamente.']);
        }

        return response()->json(['message' => 'Token invalido o expirado.'], 422);
    }

    /**
     * Obtener usuario autenticado actual
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }
}
```

---

## PASO 2 — UserController (CU04)

Crear `backend/app/Http/Controllers/UserController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\BitacoraAcceso;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
    /**
     * CU04 - Listar usuarios (con filtros)
     *
     * Diagrama: Administrador → IU_Usuarios → CTR_Usuarios.listar()
     *   → CE_Usuario.filtrar()
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }
        if ($request->has('active')) {
            $query->where('active', $request->boolean('active'));
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'ilike', "%{$s}%")
                  ->orWhere('email', 'ilike', "%{$s}%");
            });
        }

        return response()->json($query->orderBy('name')->paginate(15));
    }

    /**
     * CU04 - Crear usuario
     *
     * Diagrama: Admin → IU_Usuarios → CTR_Usuarios.crear()
     *   → CE_Usuario.verificarDuplicado() → CE_Usuario.persistir()
     *   → CE_BitacoraAcceso.registrar() → retornar
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|in:Administrador,Coordinador,Docente,Postulante',
        ]);

        $tempPassword = Str::random(10);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($tempPassword),
            'role' => $validated['role'],
            'active' => true,
        ]);

        BitacoraAcceso::create([
            'user_id' => $request->user()->id,
            'ip_address' => $request->ip(),
            'action' => "CREAR_USUARIO:{$user->id}:{$user->email}",
        ]);

        return response()->json([
            'message' => 'Usuario creado exitosamente.',
            'user' => $user,
            'temp_password' => $tempPassword,
        ], 201);
    }

    /**
     * CU04 - Ver usuario
     */
    public function show(User $user): JsonResponse
    {
        return response()->json($user);
    }

    /**
     * CU04 - Actualizar usuario
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => "sometimes|email|unique:users,email,{$user->id}",
            'role' => 'sometimes|in:Administrador,Coordinador,Docente,Postulante',
            'active' => 'sometimes|boolean',
        ]);

        $user->update($validated);

        BitacoraAcceso::create([
            'user_id' => $request->user()->id,
            'ip_address' => $request->ip(),
            'action' => "MODIFICAR_USUARIO:{$user->id}",
        ]);

        return response()->json(['message' => 'Usuario actualizado.', 'user' => $user->fresh()]);
    }

    /**
     * CU04 - Desactivar usuario (soft delete)
     *
     * Diagrama: Admin → CTR_Usuarios.desactivar() → CE_Usuario.active=false → invalidar tokens
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'No puede desactivarse a si mismo.'], 422);
        }

        $user->update(['active' => false]);
        $user->tokens()->delete();

        BitacoraAcceso::create([
            'user_id' => $request->user()->id,
            'ip_address' => $request->ip(),
            'action' => "DESACTIVAR_USUARIO:{$user->id}",
        ]);

        return response()->json(['message' => 'Usuario desactivado.']);
    }
}
```

---

## PASO 3 — Archivo de Rutas API completo

Sobreescribir `backend/routes/api.php`:

```php
<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rutas Publicas (sin autenticacion)
|--------------------------------------------------------------------------
*/
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

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
});
```

---

## PASO 4 — Seeder para pruebas

Editar `backend/database/seeders/DatabaseSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Admin CUP',
            'email' => 'admin@ficct.uagrm.edu.bo',
            'password' => Hash::make('Admin2026!'),
            'role' => 'Administrador',
            'active' => true,
        ]);

        User::create([
            'name' => 'Coordinador CUP',
            'email' => 'coordinador@ficct.uagrm.edu.bo',
            'password' => Hash::make('Coord2026!'),
            'role' => 'Coordinador',
            'active' => true,
        ]);

        User::create([
            'name' => 'Docente Test',
            'email' => 'docente@ficct.uagrm.edu.bo',
            'password' => Hash::make('Docente2026!'),
            'role' => 'Docente',
            'active' => true,
        ]);

        User::create([
            'name' => 'Postulante Test',
            'email' => 'postulante@gmail.com',
            'password' => Hash::make('Post2026!'),
            'role' => 'Postulante',
            'active' => true,
        ]);
    }
}
```

---

## PASO 5 — Verificar y probar

```bash
cd backend
php artisan migrate:fresh --seed
php artisan serve
```

### Tests con curl (PowerShell):

```powershell
# 1. Login exitoso
$response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@ficct.uagrm.edu.bo","password":"Admin2026!"}'
$token = $response.token
Write-Host "Token: $token"

# 2. Ver perfil
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/me" -Headers @{Authorization="Bearer $token"}

# 3. Crear usuario
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/users" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"name":"Nuevo User","email":"nuevo@test.com","role":"Postulante"}'

# 4. Listar usuarios
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/users" -Headers @{Authorization="Bearer $token"}

# 5. Logout
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/logout" -Method POST -Headers @{Authorization="Bearer $token"}

# 6. Login fallido (3 intentos bloquean)
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@ficct.uagrm.edu.bo","password":"WRONGPASS"}'
```

---

## CRITERIO DE ACEPTACION

- [ ] `POST /api/login` retorna token con credenciales validas
- [ ] `POST /api/login` retorna 422 con credenciales invalidas
- [ ] Tras 3 intentos fallidos en 15 min, retorna 423 (cuenta bloqueada)
- [ ] `POST /api/logout` invalida token y registra en bitacora
- [ ] `POST /api/forgot-password` retorna 200 (email se ve en `storage/logs/laravel.log`)
- [ ] `GET /api/users` solo funciona con token de Administrador
- [ ] `POST /api/users` crea usuario y retorna password temporal
- [ ] `DELETE /api/users/{id}` desactiva usuario (no lo borra)
- [ ] Cada accion queda registrada en tabla `bitacora_accesos`
