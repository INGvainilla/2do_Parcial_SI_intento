# Guia de instalacion del entorno (Windows) - CUP FICCT

Esta guia documenta el proceso completo para dejar listo el entorno de desarrollo del proyecto CUP FICCT en Windows, incluyendo validaciones y soluciones a errores comunes.

## 1) Stack requerido

- Backend: PHP 8.2+ (objetivo del proyecto: Laravel 11)
- Frontend: Node.js 20 LTS + npm
- Base de datos: PostgreSQL 16
- Gestor PHP: Composer 2.x
- Control de versiones: Git 2.x

## 2) Verificacion inicial

Abrir PowerShell y ejecutar:

```powershell
php --version
composer --version
node --version
npm --version
git --version
psql --version
```

Si algun comando no responde, continuar con la instalacion de ese componente.

---

## 3) Instalar Git

1. Descargar: https://git-scm.com/download/win
2. Durante instalacion:
   - habilitar "Git Bash Here"
   - usar Git desde command prompt
3. Verificar:

```powershell
git --version
```

Configurar identidad:

```powershell
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

---

## 4) Instalar PHP con XAMPP

> Nota: en la web oficial de XAMPP para Windows puede no existir PHP 8.3. Se uso XAMPP 8.2.12 (compatible con Laravel 11).

1. Descargar XAMPP (Windows): https://www.apachefriends.org/download.html
2. Instalar en:

`C:\xampp`

3. Verificar binario:

```powershell
C:\xampp\php\php.exe --version
```

### 4.1 Agregar PHP al PATH

Agregar al PATH (usuario y/o sistema):

`C:\xampp\php`

### 4.2 Corregir conflicto de multiples PHP (muy importante)

Si `where php` muestra primero `C:\php\php.exe`, Windows usara el PHP incorrecto.

Verificar:

```powershell
where.exe php
php --version
php --ini
```

Esperado:

- primero `C:\xampp\php\php.exe`
- `php --version` con 8.2.12
- `Loaded Configuration File: C:\xampp\php\php.ini`

Si aparece `C:\php\php.exe` primero, eliminar `C:\php` del PATH (usuario y sistema), y dejar `C:\xampp\php` arriba.

---

## 5) Habilitar extensiones PHP requeridas

Editar:

`C:\xampp\php\php.ini`

Dejar activas (sin `;`) estas lineas:

```ini
extension=pgsql
extension=pdo_pgsql
extension=mbstring
extension=curl
extension=zip
extension=fileinfo
extension=bcmath
extension=openssl
extension=sodium
```

Validar:

```powershell
php -m | findstr /i "pgsql pdo_pgsql mbstring curl zip fileinfo bcmath openssl sodium"
```

---

## 6) Instalar Composer correctamente

1. Descargar: https://getcomposer.org/download/
2. Ejecutar `Composer-Setup.exe`
3. En "Command-line PHP", seleccionar:

`C:\xampp\php\php.exe`

4. No usar proxy (si no corresponde)
5. Finalizar instalacion

Verificar:

```powershell
composer --version
```

Esperado: Composer 2.x usando `PHP 8.2.12 (C:\xampp\php\php.exe)`.

---

## 7) Instalar Node.js 20 LTS

Comando recomendado:

```powershell
winget install --id OpenJS.NodeJS.20 -e --accept-source-agreements --accept-package-agreements
```

Verificar:

```powershell
node --version
npm --version
where.exe node
```

Esperado:

- `node` en `v20.x`
- ruta como `C:\Program Files\nodejs\node.exe`

### 7.1 Error 1603 en instalacion Node

Si aparece error 1603, revisar log de winget. Causa comun: ya existe una version mas nueva instalada (ej. Node 25).  
Solucion: desinstalar version existente y reinstalar Node 20.

---

## 8) Instalar PostgreSQL 16

1. Descargar desde EDB: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
2. Elegir fila 16.x y columna Windows x86-64
3. Componentes recomendados:
   - PostgreSQL Server
   - Command Line Tools
   - pgAdmin 4
4. Configuracion:
   - usuario superadmin: `postgres`
   - puerto: `5432`
   - locale recomendado: `English, United States`
5. Finalizar instalacion (desmarcar Stack Builder al terminar)

### 8.1 Agregar psql al PATH

Agregar:

`C:\Program Files\PostgreSQL\16\bin`

Verificar:

```powershell
psql --version
where.exe psql
```

---

## 9) Crear usuario y base de datos del proyecto

Primero, validar acceso con `postgres`:

```powershell
$env:PGPASSWORD="TU_PASSWORD_POSTGRES"
psql -h 127.0.0.1 -U postgres -d postgres -c "SELECT current_user;"
```

Luego crear usuario y BD:

```powershell
psql -h 127.0.0.1 -U postgres -d postgres -c "CREATE USER cup_user WITH PASSWORD 'cup2026';"
psql -h 127.0.0.1 -U postgres -d postgres -c "CREATE DATABASE ficct_cup_db OWNER cup_user;"
psql -h 127.0.0.1 -U postgres -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE ficct_cup_db TO cup_user;"
```

> Nota: en prompt de password de PostgreSQL, al escribir no se ven caracteres. Es normal.

---

## 10) Importar estructura SQL del proyecto

Archivo SQL:

`BASE_DE_DATOS/FICCT.sql`

Importar:

```powershell
$env:PGPASSWORD="cup2026"
psql -h 127.0.0.1 -U cup_user -d ficct_cup_db -f "C:\Users\mujic\OneDrive\Escritorio\2do Parcial SI\2do_Parcial_SI\BASE_DE_DATOS\FICCT.sql"
```

Ver tablas:

```powershell
psql -h 127.0.0.1 -U cup_user -d ficct_cup_db -c "\dt"
```

Resultado esperado final: 23 tablas.

---

## 11) Correccion detectada en `FICCT.sql`

Durante la importacion aparecio este error:

- `UNIQUE(postulante_id, gestion_id)` en tabla `postulantes_grupos`
- `gestion_id` no existe en esa tabla

Correccion sugerida en el SQL fuente:

```sql
UNIQUE(postulante_id, grupo_id)
```

Despues de esa correccion, la tabla `postulantes_grupos` se crea sin errores.

---

## 12) Checklist final de entorno

Ejecutar:

```powershell
php --version
php --ini
php -m | findstr /i "pgsql pdo_pgsql mbstring curl zip fileinfo bcmath openssl sodium"
composer --version
node --version
npm --version
git --version
psql --version
```

Todo debe responder sin error.

---

## 13) Comandos utiles de troubleshooting

Ver que ejecutable se esta usando:

```powershell
where.exe php
where.exe node
where.exe psql
```

Sesion temporal para usar password en psql:

```powershell
$env:PGPASSWORD="mi_password"
```

Limpiar variable al terminar:

```powershell
Remove-Item Env:PGPASSWORD
```

---

## 14) Estado final alcanzado en esta instalacion

- PHP: 8.2.12 desde XAMPP
- Composer: 2.10.0 usando `C:\xampp\php\php.exe`
- Node: v20.20.2
- npm: 10.8.2
- PostgreSQL: 16.14
- psql en PATH: OK
- Base `ficct_cup_db`: creada
- Usuario `cup_user`: creado
- Tablas importadas: 23

