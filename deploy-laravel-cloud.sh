#!/bin/bash
# Script de despliegue para Laravel Cloud

# Configurar para salir inmediatamente si ocurre algÃºn error
set -e

echo "=========================================================="
echo "=== INICIANDO PREPARACIÃ“N DE DESPLIEGUE EN LARAVEL CLOUD ==="
echo "=========================================================="

# 1. Instalar dependencias del frontend y compilar
echo "--> Instalando dependencias de frontend..."
cd frontend
npm install --no-audit --no-fund

echo "--> Compilando frontend (React + Tailwind)..."
npm run build
cd ..

# 2. Respaldar temporalmente la carpeta backend
echo "--> Respaldando temporalmente la carpeta del backend..."
mkdir -p /tmp/backend-temp
cp -r backend/* /tmp/backend-temp/
if [ -f backend/.env.example ]; then
    cp backend/.env.example /tmp/backend-temp/
fi

# 3. Eliminar directorios de desarrollo para evitar conflictos en la raÃ­z
echo "--> Limpiando directorios del monorepo..."
rm -rf backend frontend BASE_DE_DATOS ParametrosParcial documentacion README.md

# 4. Copiar todo el contenido del backend al directorio raÃ­z
echo "--> Promocionando backend al directorio raÃ­z..."
cp -r /tmp/backend-temp/* .
if [ -f /tmp/backend-temp/.env.example ]; then
    cp /tmp/backend-temp/.env.example .env
fi
rm -rf /tmp/backend-temp

# 5. Ejecutar composer install en la raÃ­z para garantizar la carpeta vendor en producciÃ³n
echo "--> Instalando dependencias de PHP (composer install)..."
composer install --no-dev --optimize-autoloader --ignore-platform-reqs

echo "=========================================================="
echo "=== Â¡PROYECTO REORGANIZADO PARA LA RAÃ Z CON Ã‰XITO! ==="
echo "=========================================================="
