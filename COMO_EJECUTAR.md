# Guía para Ejecutar el Proyecto CUP-FICCT

Esta guía explica **cómo levantar y probar el sistema cada día** y, más abajo, cómo configurarlo por primera vez.

---

## Cómo ejecutar y probar (uso diario)

Cada vez que quieras trabajar en el proyecto necesitas **dos terminales abiertas a la vez**. Antes de empezar, asegúrate de que **PostgreSQL** esté encendido.

### Paso 1 — Backend (Terminal 1)

Abre una terminal, entra a la carpeta `backend` e inicia el servidor PHP:

```bash
cd backend
php -S 127.0.0.1:8000 -t public public/index.php
```

Deja esa terminal **abierta**. Si la cierras, la API deja de funcionar.

- API Laravel: **http://127.0.0.1:8000**
- Prueba rápida en el navegador: **http://127.0.0.1:8000/api/carreras** (debe responder JSON si la BD está cargada)

### Paso 2 — Frontend (Terminal 2)

Abre una **segunda** terminal, entra a `frontend` y arranca Vite:

```bash
cd frontend
npm run dev
```

Deja esa terminal **abierta** también.

- Portal web: **http://localhost:5173**

### Paso 3 — Probar en el navegador

1. Abre **http://localhost:5173**
2. Inicia sesión con una cuenta de prueba (ver tabla de credenciales más abajo)
3. El frontend llama al backend en el puerto **8000**; ambos servidores deben estar corriendo

**Credenciales rápidas para probar:**

| Rol | Correo | Contraseña |
|-----|--------|------------|
| Administrador | `admin@ficct.uagrm.edu.bo` | `Admin2026!` |
| Coordinador | `coordinador@ficct.uagrm.edu.bo` | `Coord2026!` |
| Docente | `docente@ficct.uagrm.edu.bo` | `Docente2026!` |
| Postulante | `postulante@gmail.com` | `Post2026!` |

### Resumen en una línea

| Terminal | Carpeta | Comando |
|----------|---------|---------|
| 1 — Backend | `backend/` | `php -S 127.0.0.1:8000 -t public public/index.php` |
| 2 — Frontend | `frontend/` | `npm run dev` |

> **Nota:** El comando del backend es `php -S` (servidor integrado de PHP), no `php artisan serve`. Se usa así para que las rutas `/api/*` funcionen correctamente en este proyecto.

---

## Requisitos previos

| Herramienta | Versión mínima recomendada |
|-------------|---------------------------|
| **PHP** | 8.2+ (con extensiones `pgsql`, `mbstring`, `openssl`, `pdo`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`) |
| **Composer** | 2.x |
| **Node.js** | 18+ |
| **npm** | 9+ |
| **PostgreSQL** | 14+ (16 recomendado) |

Servicios que deben estar activos antes de trabajar:
- PostgreSQL en `127.0.0.1:5432`
- (Opcional) Stripe en modo test, si vas a probar pagos reales

---

## Configuración inicial (primera vez)

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repositorio>
cd 2do_Parcial_SI
```

**Backend:**
```bash
cd backend
composer install
copy .env.example .env        # Windows
# cp .env.example .env        # Linux / macOS
php artisan key:generate
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### 2. Crear la base de datos PostgreSQL

Abre `psql` o pgAdmin y ejecuta:

```sql
CREATE DATABASE ficct_cup;
```

Puedes usar otro nombre; solo debe coincidir con `DB_DATABASE` en tu `.env`.

### 3. Configurar el archivo `.env` del backend

Edita `backend/.env` con estos valores mínimos:

```env
APP_NAME="CUP FICCT"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=ficct_cup
DB_USERNAME=postgres
DB_PASSWORD=tu_contraseña

SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database

MAIL_MAILER=log
FRONTEND_URL=http://localhost:5173
```

### 4. Crear todas las tablas (migraciones Laravel)

Desde `backend/`:

```bash
php artisan migrate
```

Este comando ejecuta las **33 migraciones** del proyecto y crea **32 tablas** en PostgreSQL (ver listado abajo).

### 5. Poblar la base de datos (Obligatorio)

La base de datos debe ser poblada utilizando los scripts SQL proporcionados en la carpeta `BASE_DE_DATOS`. Estos archivos contienen la población completa de postulantes, grupos, docentes, etc.

Ejecuta estos archivos directamente en tu gestor de base de datos PostgreSQL en el siguiente orden:

1. **Estructura base:** Ejecuta `BASE_DE_DATOS/FICCT_v2.sql`
2. **Población de datos:** Ejecuta `BASE_DE_DATOS/INSERTS_POBLACION_COMPLETA.sql`

### 6. Verificar que las tablas existen

```bash
php artisan migrate:status
php check_tables.php
```

Debes ver **32 tablas** y **33 migraciones** en estado `Ran`.

> Si ya completaste la configuración inicial, vuelve arriba a la sección **Cómo ejecutar y probar (uso diario)** — ahí están los comandos `php -S` y `npm run dev`.

---

## Base de datos: opciones de actualización

### Opción A — Solo aplicar migraciones nuevas (conserva tus datos)

Úsala después de un `git pull` cuando el repo traiga migraciones adicionales:

```bash
cd backend
php artisan migrate
```

Es idempotente: si ya estás al día, no modifica nada.

### Opción B — Reconstruir todo desde cero

Borra **todas** las tablas y datos, vuelve a migrar y siembra la población completa:

```bash
cd backend
php artisan migrate:fresh --seed
```

Esto deja el sistema listo con:
- Gestión activa `1-2026`
- 1.600+ postulantes en estado `Inscrito`
- Requisitos y pagos validados
- Cuentas admin/coordinador/docente/postulante con contraseñas conocidas
- Horarios institucionales por grupo/materia (CU12)

### Verificar estado de migraciones

```bash
php artisan migrate:status
```

---

## Esquema de referencia SQL

| Archivo | Descripción |
|---------|-------------|
| `BASE_DE_DATOS/FICCT_v2.sql` | DDL completo del esquema de negocio (tablas, FK, índices) |
| `BASE_DE_DATOS/INSERTS_POBLACION_COMPLETA.sql` | Población masiva usada por `DatabaseSeeder` |
| `BASE_DE_DATOS/modelo_conceptual_bd.puml` | Diagrama PlantUML del modelo conceptual |

> Las migraciones Laravel son la **fuente de verdad** para crear la BD en desarrollo. `FICCT_v2.sql` documenta el esquema resultante y debe mantenerse alineado con ellas.

---

## Diagrama de clases — Modelo conceptual (PlantText)

1. Abre [https://www.planttext.com/](https://www.planttext.com/)
2. Copia el contenido de `BASE_DE_DATOS/modelo_conceptual_bd.puml`
3. Pégalo en el editor y pulsa **Refresh**

El diagrama incluye **22 entidades de negocio** con nombres y columnas tal como están en `FICCT_v2.sql`, más las relaciones (FK). Las tablas de infraestructura Laravel (`cache`, `jobs`, `sessions`, etc.) se omiten del diagrama conceptual.

---

## Tablas creadas por las migraciones (32 total)

### Infraestructura Laravel (10)
| # | Tabla |
|---|-------|
| 1 | `migrations` |
| 2 | `users` |
| 3 | `password_reset_tokens` |
| 4 | `sessions` |
| 5 | `cache` |
| 6 | `cache_locks` |
| 7 | `jobs` |
| 8 | `job_batches` |
| 9 | `failed_jobs` |
| 10 | `personal_access_tokens` |

### Dominio del sistema CUP-FICCT (22)
| # | Tabla | Módulo |
|---|-------|--------|
| 11 | `bitacora_accesos` | Autenticación |
| 12 | `notificaciones` | Reportes / IA |
| 13 | `gestiones` | Admisión |
| 14 | `carreras` | Admisión |
| 15 | `cupos_gestion` | Admisión |
| 16 | `admisiones` | Admisión |
| 17 | `postulantes` | Registro |
| 18 | `requisitos_documentales` | Registro |
| 19 | `pagos` | Registro |
| 20 | `conversaciones_chatbot` | Reportes / IA |
| 21 | `aulas` | Planificación |
| 22 | `grupos` | Planificación |
| 23 | `materias` | Planificación |
| 24 | `asignaciones_grupo` | Planificación |
| 25 | `docentes` | Planificación (CU12, CU24, CU25) |
| 26 | `especialidades` | Planificación (CU24) |
| 27 | `asignaciones_docente` | Planificación (CU12) |
| 28 | `horarios_grupo_materia` | Planificación (CU12) |
| 29 | `preguntas_simulacro` | Evaluación |
| 30 | `examenes` | Evaluación |
| 31 | `notas_finales` | Evaluación |
| 32 | `auditoria_notas` | Evaluación |

---

## Migraciones del repositorio (33 total)

Ejecutadas en orden por `php artisan migrate`:

| # | Archivo de migración |
|---|---------------------|
| 1 | `0001_01_01_000000_create_users_table` |
| 2 | `0001_01_01_000001_create_cache_table` |
| 3 | `0001_01_01_000002_create_jobs_table` |
| 4 | `2026_05_31_205200_align_users_with_cup_v2_schema` |
| 5 | `2026_06_01_013918_create_personal_access_tokens_table` |
| 6 | `2026_06_01_014001_create_bitacora_accesos_table` |
| 7 | `2026_06_01_014002_create_gestiones_table` |
| 8 | `2026_06_01_014003_create_carreras_table` |
| 9 | `2026_06_01_014004_create_cupos_gestion_table` |
| 10 | `2026_06_01_014005_create_postulantes_table` |
| 11 | `2026_06_01_014006_create_requisitos_documentales_table` |
| 12 | `2026_06_01_014007_create_pagos_table` |
| 13 | `2026_06_01_014008_create_materias_table` |
| 14 | `2026_06_01_014009_create_aulas_table` |
| 15 | `2026_06_01_014010_create_grupos_table` |
| 16 | `2026_06_01_014011_create_asignaciones_grupo_table` |
| 17 | `2026_06_01_014012_create_docentes_table` |
| 18 | `2026_06_01_014013_create_asignaciones_docente_table` |
| 19 | `2026_06_01_014014_create_examenes_table` |
| 20 | `2026_06_01_014015_create_notas_finales_table` |
| 21 | `2026_06_01_014016_create_admisiones_table` |
| 22 | `2026_06_01_014017_create_preguntas_simulacro_table` |
| 23 | `2026_06_05_000001_create_notificaciones_table` |
| 24 | `2026_06_05_000002_create_conversaciones_chatbot_table` |
| 25 | `2026_06_05_000003_create_auditoria_notas_table` |
| 26 | `2026_06_08_062058_add_intentos_fallidos_to_users_table` |
| 27 | `2026_06_08_070553_add_observaciones_to_notas_finales_table` |
| 28 | `2026_06_09_000001_add_postulacion_fields_to_docentes_table` |
| 29 | `2026_06_09_000002_create_especialidades_table` |
| 30 | `2026_06_09_000003_create_horarios_grupo_materia_table` |
| 31 | `2026_06_09_000004_populate_horarios_grupo_materia` |
| 32 | `2026_06_09_000005_regenerate_horarios_por_grupo` |
| 33 | `2026_06_09_000006_horarios_lunes_a_viernes` |

---

### Cuentas pre-configuradas

Tras poblar la base de datos con los scripts SQL, usa estas cuentas en **http://localhost:5173**:

| Rol | Correo | Contraseña |
|-----|--------|------------|
| **Administrador** | `admin@ficct.uagrm.edu.bo` | `Admin2026!` |
| **Coordinador** | `coordinador@ficct.uagrm.edu.bo` | `Coord2026!` |
| **Docente (prueba)** | `docente@ficct.uagrm.edu.bo` | `Docente2026!` |
| **Postulante (prueba)** | `postulante@gmail.com` | `Post2026!` |

Docentes sembrados por materia (desde `INSERTS_POBLACION_COMPLETA.sql`):

| Docente | Correo |
|---------|--------|
| Prof0 (Matemáticas) | `matematicas@ficct.edu.bo` |
| Prof1 (Física) | `fisica@ficct.edu.bo` |
| Prof2 (Computación) | `computacion@ficct.edu.bo` |
| Prof3 (Inglés) | `ingles@ficct.edu.bo` |

> Las contraseñas de Prof0–Prof3 provienen del script SQL de población; la cuenta `docente@ficct.uagrm.edu.bo` siempre queda con `Docente2026!` tras el seed.

---

## Estado inicial del sistema para casos de uso

Con la base sembrada, puedes probar de inmediato:

1. **CU10 — Grupos:** Admin/Coordinador → Planificación → Grupos → Asignación masiva (1.600+ postulantes en paralelos de hasta 70).
2. **CU12 — Docentes:** Planificación → Docentes → asignar docentes a materias (máx. 4 grupos por docente; validación de choque de horarios).
3. **CU24/CU25 — Postulación docente:** Formulario público + revisión en Planificación → Revisar Postulaciones Docentes.
4. **Mi Horario:** Postulantes y docentes ven su horario en Planificación → Mi Horario.
5. **Simulacro de examen:** Ingresa como postulante de prueba.
6. **Notas y admisiones:** Panel administrativo para calificaciones, auditoría y admitidos.

---

## Solución de problemas frecuentes

| Problema | Solución |
|----------|----------|
| `could not find driver` | Habilita `extension=pdo_pgsql` en `php.ini` |
| Error de conexión PostgreSQL | Verifica que el servicio esté activo y que `DB_*` en `.env` sea correcto |
| `Class DomPDF not found` | Ejecuta `composer install` en `backend/` |
| Faltan tablas tras `git pull` | Ejecuta `php artisan migrate` |
| Datos inconsistentes | Ejecuta `php artisan migrate:fresh --seed` (borra todo) |
