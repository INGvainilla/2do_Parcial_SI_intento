---
name: ficct-fase1-fundacion-backend
description: >
  Configura la base del backend Laravel para el sistema CUP-FICCT:
  instala Sanctum, crea routes/api.php, registra middleware de roles,
  genera TODAS las migraciones que faltan segun FICCT_v2.sql, y crea
  todos los modelos Eloquent con relaciones.
  Prerequisito: Laravel 11 instalado en backend/, PostgreSQL conectado, DB ficct_cup_db creada.
  Trigger: "configurar backend", "modelos", "migraciones", "sanctum", "api routes".
---

# FASE 1 — Fundacion del Backend

> **Objetivo**: Dejar el backend 100% listo para recibir logica de negocio.
> Al terminar esta fase se puede correr `php artisan migrate:fresh --seed` sin errores
> y todas las tablas de FICCT_v2.sql existen via migraciones Laravel.

---

## CONTEXTO DEL PROYECTO

- **Stack**: Laravel 11 + React 18 + PostgreSQL 16
- **BD actual**: `ficct_cup_db` con DDL externo (`BASE_DE_DATOS/FICCT_v2.sql`)
- **Modelo User**: Ya tiene campos `role` y `active`
- **Directorio backend**: `backend/`

## ESTADO ACTUAL DEL BACKEND

```
backend/
├── app/Models/User.php          (ya tiene role, active)
├── bootstrap/app.php            (sin middleware custom)
├── routes/web.php               (solo welcome)
├── routes/api.php               (NO EXISTE)
├── database/migrations/
│   ├── 0001_01_01_000000_create_users_table.php
│   ├── 0001_01_01_000001_create_cache_table.php
│   ├── 0001_01_01_000002_create_jobs_table.php
│   └── 2026_05_31_205200_align_users_with_cup_v2_schema.php
```

---

## PASO 1 — Instalar Sanctum y crear routes/api.php

```bash
cd backend
composer require laravel/sanctum
php artisan install:api
```

El comando `install:api` crea:
- `routes/api.php`
- Migracion de `personal_access_tokens`
- Registra el archivo de rutas API en `bootstrap/app.php`

Verificar que `bootstrap/app.php` quede con la ruta API registrada:

```php
<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
```

---

## PASO 2 — Middleware de Roles

Crear `backend/app/Http/Middleware/RoleMiddleware.php`:

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, $roles)) {
            return response()->json([
                'message' => 'No tiene permisos para acceder a este recurso.',
            ], 403);
        }

        return $next($request);
    }
}
```

---

## PASO 3 — Agregar HasApiTokens al modelo User

Editar `backend/app/Models/User.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'active' => 'boolean',
        ];
    }
}
```

---

## PASO 4 — Migraciones (tablas que faltan segun FICCT_v2.sql)

Ejecutar en orden:

```bash
php artisan make:migration create_bitacora_accesos_table
php artisan make:migration create_gestiones_table
php artisan make:migration create_carreras_table
php artisan make:migration create_cupos_gestion_table
php artisan make:migration create_postulantes_table
php artisan make:migration create_requisitos_documentales_table
php artisan make:migration create_pagos_table
php artisan make:migration create_materias_table
php artisan make:migration create_aulas_table
php artisan make:migration create_grupos_table
php artisan make:migration create_asignaciones_grupo_table
php artisan make:migration create_docentes_table
php artisan make:migration create_asignaciones_docente_table
php artisan make:migration create_examenes_table
php artisan make:migration create_notas_finales_table
php artisan make:migration create_admisiones_table
php artisan make:migration create_preguntas_simulacro_table
```

### Contenido de CADA migracion:

#### bitacora_accesos
```php
Schema::create('bitacora_accesos', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
    $table->string('ip_address', 45);
    $table->string('action', 255);
    $table->timestamp('created_at')->useCurrent();
});
```

#### gestiones
```php
Schema::create('gestiones', function (Blueprint $table) {
    $table->id();
    $table->string('codigo', 10)->unique();
    $table->boolean('activa')->default(false);
    $table->date('fecha_inicio');
    $table->date('fecha_fin');
    $table->timestamp('created_at')->useCurrent();
});
```

#### carreras
```php
Schema::create('carreras', function (Blueprint $table) {
    $table->id();
    $table->string('nombre', 100)->unique();
    $table->string('codigo', 10)->unique();
});
```

#### cupos_gestion
```php
Schema::create('cupos_gestion', function (Blueprint $table) {
    $table->id();
    $table->foreignId('gestion_id')->constrained('gestiones')->cascadeOnDelete();
    $table->foreignId('carrera_id')->constrained('carreras')->cascadeOnDelete();
    $table->integer('cupo_maximo');
    $table->integer('cupos_disponibles');
    $table->timestamp('created_at')->useCurrent();
    $table->unique(['gestion_id', 'carrera_id']);
});
```

#### postulantes
```php
Schema::create('postulantes', function (Blueprint $table) {
    $table->id();
    $table->string('ci', 20)->unique();
    $table->string('nombres', 150);
    $table->string('apellidos', 150);
    $table->date('fecha_nacimiento');
    $table->char('sexo', 1);
    $table->string('direccion', 255)->nullable();
    $table->string('telefono', 20)->nullable();
    $table->string('email', 150);
    $table->string('colegio_procedencia', 150)->nullable();
    $table->string('ciudad', 100)->default('Santa Cruz de la Sierra');
    $table->string('titulo_bachiller', 255)->nullable();
    $table->foreignId('primera_opcion_id')->constrained('carreras');
    $table->foreignId('segunda_opcion_id')->constrained('carreras');
    $table->string('turno_preferencia', 20);
    $table->foreignId('gestion_id')->constrained('gestiones');
    $table->string('estado', 50)->default('Preinscrito');
    $table->boolean('recurrente')->default(false);
    $table->timestamps();
});
```

#### requisitos_documentales
```php
Schema::create('requisitos_documentales', function (Blueprint $table) {
    $table->id();
    $table->foreignId('postulante_id')->unique()->constrained('postulantes')->cascadeOnDelete();
    $table->boolean('ci_digitalizado')->default(false);
    $table->boolean('certificado_nacimiento')->default(false);
    $table->boolean('titulo_bachiller_legalizado')->default(false);
    $table->boolean('formulario_preinscripcion')->default(false);
    $table->boolean('verificado_bd_externa')->default(false);
    $table->timestamp('updated_at')->useCurrent();
});
```

#### pagos
```php
Schema::create('pagos', function (Blueprint $table) {
    $table->id();
    $table->foreignId('postulante_id')->constrained('postulantes')->cascadeOnDelete();
    $table->string('stripe_checkout_id', 255)->unique();
    $table->decimal('monto', 10, 2);
    $table->string('estado_pago', 50);
    $table->timestamp('fecha_pago')->useCurrent();
});
```

#### materias
```php
Schema::create('materias', function (Blueprint $table) {
    $table->id();
    $table->string('nombre', 50)->unique();
    $table->string('codigo', 10)->unique();
});
```

#### aulas
```php
Schema::create('aulas', function (Blueprint $table) {
    $table->id();
    $table->string('nombre', 50);
    $table->integer('capacidad');
    $table->string('ubicacion', 100)->nullable();
});
```

#### grupos
```php
Schema::create('grupos', function (Blueprint $table) {
    $table->id();
    $table->integer('numero');
    $table->foreignId('gestion_id')->constrained('gestiones')->cascadeOnDelete();
    $table->string('turno', 20);
    $table->foreignId('aula_id')->constrained('aulas');
    $table->timestamp('created_at')->useCurrent();
    $table->unique(['gestion_id', 'turno', 'numero']);
});
```

#### asignaciones_grupo
```php
Schema::create('asignaciones_grupo', function (Blueprint $table) {
    $table->id();
    $table->foreignId('postulante_id')->unique()->constrained('postulantes')->cascadeOnDelete();
    $table->foreignId('grupo_id')->constrained('grupos')->cascadeOnDelete();
    $table->timestamp('created_at')->useCurrent();
});
```

#### docentes
```php
Schema::create('docentes', function (Blueprint $table) {
    $table->id();
    $table->string('ci', 20)->unique();
    $table->string('nombres', 150);
    $table->string('apellidos', 150);
    $table->string('especialidad', 100);
    $table->string('grado_academico', 100);
    $table->string('correo', 150);
    $table->timestamp('created_at')->useCurrent();
});
```

#### asignaciones_docente
```php
Schema::create('asignaciones_docente', function (Blueprint $table) {
    $table->id();
    $table->foreignId('docente_id')->constrained('docentes')->cascadeOnDelete();
    $table->foreignId('grupo_id')->constrained('grupos')->cascadeOnDelete();
    $table->foreignId('materia_id')->constrained('materias')->cascadeOnDelete();
    $table->timestamp('created_at')->useCurrent();
    $table->unique(['grupo_id', 'materia_id']);
});
```

#### examenes
```php
Schema::create('examenes', function (Blueprint $table) {
    $table->id();
    $table->foreignId('postulante_id')->constrained('postulantes')->cascadeOnDelete();
    $table->foreignId('materia_id')->constrained('materias')->cascadeOnDelete();
    $table->integer('numero_examen');
    $table->decimal('nota', 5, 2);
    $table->timestamp('created_at')->useCurrent();
    $table->unique(['postulante_id', 'materia_id', 'numero_examen']);
});
```

#### notas_finales
```php
Schema::create('notas_finales', function (Blueprint $table) {
    $table->id();
    $table->foreignId('postulante_id')->constrained('postulantes')->cascadeOnDelete();
    $table->foreignId('materia_id')->constrained('materias')->cascadeOnDelete();
    $table->decimal('promedio', 5, 2);
    $table->string('estado', 20);
    $table->timestamp('updated_at')->useCurrent();
    $table->unique(['postulante_id', 'materia_id']);
});
```

#### admisiones
```php
Schema::create('admisiones', function (Blueprint $table) {
    $table->id();
    $table->foreignId('postulante_id')->unique()->constrained('postulantes')->cascadeOnDelete();
    $table->foreignId('carrera_id')->constrained('carreras');
    $table->string('via', 50);
    $table->timestamp('fecha_admision')->useCurrent();
});
```

#### preguntas_simulacro
```php
Schema::create('preguntas_simulacro', function (Blueprint $table) {
    $table->id();
    $table->foreignId('materia_id')->constrained('materias')->cascadeOnDelete();
    $table->text('enunciado');
    $table->text('opciones');
    $table->string('respuesta_correcta', 255);
    $table->timestamp('created_at')->useCurrent();
});
```

---

## PASO 5 — Todos los Modelos Eloquent

Crear cada archivo en `backend/app/Models/`:

### BitacoraAcceso.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BitacoraAcceso extends Model
{
    public $timestamps = false;
    protected $table = 'bitacora_accesos';
    protected $fillable = ['user_id', 'ip_address', 'action'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

### Gestion.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Gestion extends Model
{
    public $timestamps = false;
    protected $table = 'gestiones';
    protected $fillable = ['codigo', 'activa', 'fecha_inicio', 'fecha_fin'];
    protected $casts = ['activa' => 'boolean', 'fecha_inicio' => 'date', 'fecha_fin' => 'date'];

    public function scopeActiva($query)
    {
        return $query->where('activa', true);
    }
}
```

### Carrera.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Carrera extends Model
{
    public $timestamps = false;
    protected $fillable = ['nombre', 'codigo'];
}
```

### Postulante.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Postulante extends Model
{
    protected $fillable = [
        'ci', 'nombres', 'apellidos', 'fecha_nacimiento', 'sexo',
        'direccion', 'telefono', 'email', 'colegio_procedencia', 'ciudad',
        'titulo_bachiller', 'primera_opcion_id', 'segunda_opcion_id',
        'turno_preferencia', 'gestion_id', 'estado', 'recurrente',
    ];

    protected $casts = ['fecha_nacimiento' => 'date', 'recurrente' => 'boolean'];

    public function primeraOpcion()
    {
        return $this->belongsTo(Carrera::class, 'primera_opcion_id');
    }

    public function segundaOpcion()
    {
        return $this->belongsTo(Carrera::class, 'segunda_opcion_id');
    }

    public function gestion()
    {
        return $this->belongsTo(Gestion::class);
    }

    public function requisitos()
    {
        return $this->hasOne(RequisitoDocumental::class);
    }

    public function pagos()
    {
        return $this->hasMany(Pago::class);
    }

    public function asignacionGrupo()
    {
        return $this->hasOne(AsignacionGrupo::class);
    }

    public function examenes()
    {
        return $this->hasMany(Examen::class);
    }

    public function notasFinales()
    {
        return $this->hasMany(NotaFinal::class);
    }
}
```

### RequisitoDocumental.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RequisitoDocumental extends Model
{
    public $timestamps = false;
    protected $table = 'requisitos_documentales';
    protected $fillable = [
        'postulante_id', 'ci_digitalizado', 'certificado_nacimiento',
        'titulo_bachiller_legalizado', 'formulario_preinscripcion', 'verificado_bd_externa',
    ];
    protected $casts = [
        'ci_digitalizado' => 'boolean',
        'certificado_nacimiento' => 'boolean',
        'titulo_bachiller_legalizado' => 'boolean',
        'formulario_preinscripcion' => 'boolean',
        'verificado_bd_externa' => 'boolean',
    ];

    public function postulante()
    {
        return $this->belongsTo(Postulante::class);
    }

    public function todosVerificados(): bool
    {
        return $this->ci_digitalizado && $this->certificado_nacimiento
            && $this->titulo_bachiller_legalizado && $this->formulario_preinscripcion
            && $this->verificado_bd_externa;
    }
}
```

### Pago.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pago extends Model
{
    public $timestamps = false;
    protected $fillable = ['postulante_id', 'stripe_checkout_id', 'monto', 'estado_pago', 'fecha_pago'];

    public function postulante()
    {
        return $this->belongsTo(Postulante::class);
    }
}
```

### Materia.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Materia extends Model
{
    public $timestamps = false;
    protected $fillable = ['nombre', 'codigo'];
}
```

### Aula.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Aula extends Model
{
    public $timestamps = false;
    protected $fillable = ['nombre', 'capacidad', 'ubicacion'];
}
```

### Grupo.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Grupo extends Model
{
    public $timestamps = false;
    protected $fillable = ['numero', 'gestion_id', 'turno', 'aula_id'];

    public function gestion()
    {
        return $this->belongsTo(Gestion::class);
    }

    public function aula()
    {
        return $this->belongsTo(Aula::class);
    }

    public function asignaciones()
    {
        return $this->hasMany(AsignacionGrupo::class);
    }

    public function docentes()
    {
        return $this->hasMany(AsignacionDocente::class);
    }

    public function cantidadEstudiantes(): int
    {
        return $this->asignaciones()->count();
    }

    public function tieneCapacidad(): bool
    {
        return $this->cantidadEstudiantes() < 70;
    }
}
```

### AsignacionGrupo.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AsignacionGrupo extends Model
{
    public $timestamps = false;
    protected $table = 'asignaciones_grupo';
    protected $fillable = ['postulante_id', 'grupo_id'];

    public function postulante()
    {
        return $this->belongsTo(Postulante::class);
    }

    public function grupo()
    {
        return $this->belongsTo(Grupo::class);
    }
}
```

### Docente.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Docente extends Model
{
    public $timestamps = false;
    protected $fillable = ['ci', 'nombres', 'apellidos', 'especialidad', 'grado_academico', 'correo'];

    public function asignaciones()
    {
        return $this->hasMany(AsignacionDocente::class);
    }

    public function cargaActual(): int
    {
        return $this->asignaciones()->count();
    }

    public function tieneCargaDisponible(): bool
    {
        return $this->cargaActual() < 4;
    }
}
```

### AsignacionDocente.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AsignacionDocente extends Model
{
    public $timestamps = false;
    protected $table = 'asignaciones_docente';
    protected $fillable = ['docente_id', 'grupo_id', 'materia_id'];

    public function docente()
    {
        return $this->belongsTo(Docente::class);
    }

    public function grupo()
    {
        return $this->belongsTo(Grupo::class);
    }

    public function materia()
    {
        return $this->belongsTo(Materia::class);
    }
}
```

### Examen.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Examen extends Model
{
    public $timestamps = false;
    protected $table = 'examenes';
    protected $fillable = ['postulante_id', 'materia_id', 'numero_examen', 'nota'];

    public function postulante()
    {
        return $this->belongsTo(Postulante::class);
    }

    public function materia()
    {
        return $this->belongsTo(Materia::class);
    }
}
```

### NotaFinal.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotaFinal extends Model
{
    public $timestamps = false;
    protected $table = 'notas_finales';
    protected $fillable = ['postulante_id', 'materia_id', 'promedio', 'estado'];

    public function postulante()
    {
        return $this->belongsTo(Postulante::class);
    }

    public function materia()
    {
        return $this->belongsTo(Materia::class);
    }
}
```

### Admision.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Admision extends Model
{
    public $timestamps = false;
    protected $table = 'admisiones';
    protected $fillable = ['postulante_id', 'carrera_id', 'via', 'fecha_admision'];

    public function postulante()
    {
        return $this->belongsTo(Postulante::class);
    }

    public function carrera()
    {
        return $this->belongsTo(Carrera::class);
    }
}
```

### PreguntaSimulacro.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PreguntaSimulacro extends Model
{
    public $timestamps = false;
    protected $table = 'preguntas_simulacro';
    protected $fillable = ['materia_id', 'enunciado', 'opciones', 'respuesta_correcta'];

    protected $casts = ['opciones' => 'array'];

    public function materia()
    {
        return $this->belongsTo(Materia::class);
    }
}
```

---

## PASO 6 — Actualizar .env

Agregar al final de `backend/.env`:

```env
FRONTEND_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_PLACEHOLDER
STRIPE_WEBHOOK_SECRET=whsec_PLACEHOLDER
STRIPE_MONTO_MATRICULA=350
```

---

## PASO 7 — Agregar config Stripe

Editar `backend/config/services.php`, agregar al array:

```php
'stripe' => [
    'secret' => env('STRIPE_SECRET_KEY'),
    'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    'monto_matricula' => env('STRIPE_MONTO_MATRICULA', 350),
],
```

---

## PASO 8 — Verificar que todo funciona

```bash
cd backend
php artisan migrate:fresh
php artisan route:list
```

Si `migrate:fresh` termina sin error y `route:list` muestra las rutas de sanctum, esta fase esta completa.

---

## CRITERIO DE ACEPTACION

- [ ] `php artisan migrate:fresh` ejecuta sin errores
- [ ] 18+ tablas creadas (17 custom + personal_access_tokens + users + cache + jobs)
- [ ] `php artisan tinker` → `User::count()` retorna 0
- [ ] `php artisan route:list` muestra `/api` prefix
- [ ] Archivo `RoleMiddleware.php` existe y esta registrado
