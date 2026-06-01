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
