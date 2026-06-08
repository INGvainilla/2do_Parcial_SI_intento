<?php

namespace App\Http\Controllers;

use App\Models\BitacoraAcceso;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
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
        // CU01 - Paso 2: B_Int -> C_Ctrl : + login(email, password)
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        // CU01 - Paso 3: C_Ctrl -> E_Usu : + where('email', email)
        $user = User::where('email', $request->email)->first();

        // CU01 - Paso 4: E_Usu --> C_Ctrl : + Datos y Hash
        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['Credenciales incorrectas.'],
            ]);
        }

        // Verificar si la cuenta esta bloqueada temporalmente o inactiva
        if (! $user->active) {
            return response()->json([
                'message' => 'Cuenta bloqueada permanentemente. Contacte al administrador o use recuperar contrasena.',
            ], 423);
        }

        // Si la cuenta estaba bloqueada temporalmente pero el tiempo ya paso, la desbloqueamos
        if ($user->bloqueado_hasta && $user->bloqueado_hasta <= now()) {
            $user->update([
                'intentos_fallidos' => 0,
                'bloqueado_hasta' => null
            ]);

            BitacoraAcceso::create([
                'user_id' => $user->id,
                'ip_address' => $request->ip(),
                'action' => 'DESBLOQUEO_AUTOMATICO',
            ]);
        }

        if ($user->bloqueado_hasta && $user->bloqueado_hasta > now()) {
            return response()->json([
                'message' => 'Cuenta bloqueada temporalmente por multiples intentos fallidos. Intente de nuevo mas tarde o use recuperar contrasena.',
            ], 423);
        }

        if (! Hash::check($request->password, $user->password)) {
            // CU01 - Paso 5 (alt invalidas): Ctrl -> E_Usu : IncrementarIntentosFallidos()
            $user->increment('intentos_fallidos');

            BitacoraAcceso::create([
                'user_id' => $user->id,
                'ip_address' => $request->ip(),
                'action' => 'LOGIN_FALLIDO',
            ]);

            if ($user->intentos_fallidos >= 3) {
                // Bloqueo temporal de 1 minuto (para pruebas)
                $user->update([
                    'bloqueado_hasta' => now()->addMinutes(1)
                ]);
                
                BitacoraAcceso::create([
                    'user_id' => $user->id,
                    'ip_address' => $request->ip(),
                    'action' => 'CUENTA_BLOQUEADA',
                ]);

                return response()->json([
                    'message' => 'Cuenta bloqueada temporalmente tras 3 intentos fallidos. Use recuperar contrasena.',
                ], 423);
            }

            // CU01 - Paso 6 (alt invalidas): Ctrl --> UI : NotificarError("Credenciales incorrectas")
            throw ValidationException::withMessages([
                'email' => ['Credenciales incorrectas. Intento ' . $user->intentos_fallidos . ' de 3.'],
            ]);
        }

        // Resetear intentos fallidos y bloqueo al iniciar sesion exitosamente
        if ($user->intentos_fallidos > 0 || $user->bloqueado_hasta !== null) {
            $user->update([
                'intentos_fallidos' => 0,
                'bloqueado_hasta' => null
            ]);
        }

        // CU01 - Paso 5: C_Ctrl -> E_Bit : + create(data)
        $token = $user->createToken('cup-session')->plainTextToken;

        BitacoraAcceso::create([
            'user_id' => $user->id,
            'ip_address' => $request->ip(),
            'action' => 'LOGIN_EXITOSO',
        ]);

        // CU01 - Paso 6: C_Ctrl --> B_Int : + Redirigir a Home
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
        // CU02 - Paso 2: B_Int -> C_Ctrl : + logout()
        // Se llama al controlador en el backend para cerrar la sesión

        // CU02 - Paso 3: C_Ctrl -> E_Bit : + create(data)
        BitacoraAcceso::create([
            'user_id' => $request->user()->id,
            'ip_address' => $request->ip(),
            'action' => 'LOGOUT',
        ]);

        $request->user()->currentAccessToken()->delete();

        // CU02 - Paso 4: C_Ctrl --> B_Int : + ConfirmarCierre()
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
        // CU03 - Paso 2: B_Int -> C_Ctrl : + forgotPassword(email)
        $request->validate(['email' => 'required|email']);

        // CU03 - Paso 3: C_Ctrl -> E_Usu : + where('email', email)
        // CU03 - Paso 4: E_Usu --> C_Ctrl : + DatosExistencia
        // Verificamos internamente pero siempre retornamos mensaje genérico (anti-enumeración)

        try {
            // CU03 - Paso 5: C_Ctrl -> C_Ctrl : + sendResetLink()
            $status = Password::sendResetLink($request->only('email'));

            if ($status === Password::RESET_LINK_SENT) {
                Log::info('CU03: Enlace de recuperación enviado exitosamente', [
                    'email' => $request->email,
                ]);
            } else {
                // Puede ser INVALID_USER, RESET_THROTTLED, etc.
                Log::warning('CU03: No se pudo enviar enlace de recuperación', [
                    'email' => $request->email,
                    'status' => $status,
                ]);
            }
        } catch (\Exception $e) {
            // Error de SMTP, conexión, etc. - loggear pero NO exponer al usuario
            Log::error('CU03: Error al enviar correo de recuperación', [
                'email' => $request->email,
                'error' => $e->getMessage(),
            ]);
        }

        // CU03 - Paso 6: C_Ctrl --> B_Int : + ConfirmarEnvio()
        // Mensaje genérico por seguridad (CU03 Excepción E1)
        return response()->json([
            'message' => 'Si el correo existe, recibirá un enlace de recuperación.',
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
