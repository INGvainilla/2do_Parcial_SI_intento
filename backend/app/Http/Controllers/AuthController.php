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
