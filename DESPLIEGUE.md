# Guía de Despliegue en Laravel Cloud — Sistema CUP FICCT

Esta guía explica paso a paso cómo desplegar este monorepo (Backend Laravel + Frontend React) en **Laravel Cloud** de forma unificada utilizando la reorganización automática en caliente durante el proceso de compilación.

---

## 🛠️ Cómo Funciona el Despliegue

Laravel Cloud espera que la aplicación de Laravel esté en la raíz del repositorio. Nuestro proyecto es un monorepo que tiene el backend en `/backend` y el frontend en `/frontend`.

Para solucionar esto de manera transparente y automatizada:
1. Hemos colocado archivos de señalización (`composer.json` y `composer.lock`) en la raíz del repositorio. Esto le indica a Laravel Cloud que es un proyecto Laravel.
2. Hemos creado un script automatizado `deploy-laravel-cloud.sh` que compila el frontend de React, coloca los archivos estáticos en `backend/public/`, y luego reorganiza el proyecto moviendo el backend a la raíz en el servidor.

---

## 🚀 Pasos para Desplegar en Laravel Cloud

### Paso 1: Conectar el Repositorio a GitHub
1. Si no lo has hecho, sube los cambios de esta rama a tu repositorio de GitHub:
   ```bash
   git add .
   git commit -m "feat: setup deployment configuration for laravel cloud"
   git push origin main
   ```

### Paso 2: Crear el Proyecto en Laravel Cloud
1. Inicia sesión en tu cuenta de [Laravel Cloud](https://cloud.laravel.com/).
2. Haz clic en **Create Project** (Crear Proyecto).
3. Selecciona tu proveedor de Git (GitHub) y selecciona este repositorio (`2do_Parcial_SI_intento`).

### Paso 3: Configurar el Comando de Construcción (Build Command)
Este es el paso **más importante** para que la compilación funcione correctamente:
1. En la configuración del entorno de tu aplicación en el dashboard de Laravel Cloud, busca la sección **Build & Deploy** o **Deployments**.
2. Modifica el **Build Command** predeterminado para que ejecute nuestro script de preparación:
   ```bash
   chmod +x deploy-laravel-cloud.sh && ./deploy-laravel-cloud.sh
   ```
3. Guarda la configuración.

### Paso 4: Configurar la Base de Datos PostgreSQL
1. En el panel de control de tu entorno en Laravel Cloud, ve a la sección **Databases** (Bases de datos).
2. Crea una nueva base de datos **PostgreSQL**.
3. Laravel Cloud inyectará automáticamente las variables de entorno de conexión (`DB_CONNECTION=pgsql`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`) a tu aplicación. No necesitas configurarlas manualmente en las variables de entorno.

### Paso 5: Configurar las Variables de Entorno (Environment Variables)
En el panel del entorno (Environment Variables), asegúrate de añadir las siguientes variables necesarias para el funcionamiento del sistema:

| Variable | Valor Recomendado / Descripción |
|---|---|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | *(Generado automáticamente por Laravel Cloud)* |
| `APP_URL` | La URL de producción proporcionada por Laravel Cloud (ej. `https://tu-app.laravel.cloud`) |
| `STRIPE_KEY` | Tu Clave Pública de Stripe (Modo Test o Live) |
| `STRIPE_SECRET` | Tu Clave Secreta de Stripe (Modo Test o Live) |
| `STRIPE_WEBHOOK_SECRET` | El webhook secret de Stripe (se obtiene al registrar la URL `https://tu-app.laravel.cloud/api/stripe/webhook` en Stripe) |

---

## 💾 Inicialización y Datos de Prueba (Seeders)

Una vez que el despliegue finalice con éxito, puedes ejecutar los comandos de Laravel desde la consola interactiva que ofrece el dashboard de Laravel Cloud o programar un comando único para correr las migraciones y seeders:

### Ejecutar Migraciones y Crear las Tablas:
```bash
php artisan migrate --force
```

### Poblar Datos de Prueba (Población Completa):
En lugar de usar `db:seed`, ejecuta directamente en tu base de datos (usando pgAdmin o DBeaver) los archivos ubicados en la carpeta `BASE_DE_DATOS` en este orden:
1. `BASE_DE_DATOS/FICCT_v2.sql`
2. `BASE_DE_DATOS/INSERTS_POBLACION_COMPLETA.sql`

---

## 🔍 Verificación del Despliegue

Una vez completado el deploy, accede a la URL pública asignada por Laravel Cloud:
- Al entrar a `https://tu-app.laravel.cloud/`, el servidor te servirá el frontend de React de forma directa.
- Cualquier llamada a la API (`/api/*`) se resolverá internamente por Laravel en el backend de forma segura y sin problemas de CORS.
- El flujo de preinscripción, verificación de requisitos y la pasarela de pagos con Stripe funcionarán en HTTPS nativo.
