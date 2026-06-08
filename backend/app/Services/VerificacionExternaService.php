<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

/**
 * Mock de servicios externos SEGIP y SEDUCA.
 * En produccion se reemplaza con HTTP requests reales.
 *
 * SEGIP: Verificar identidad del ciudadano por CI + fecha nacimiento
 * SEDUCA: Verificar titulo de bachiller por CI
 */
class VerificacionExternaService
{
    public function verificarSEGIP(string $ci, string $fechaNacimiento): array
    {
        // CU06 - Paso 2: C_Ctrl -> B_SEGIP : + ConsultarIdentidad(ci)
        Log::info('CU06: Consultando SEGIP (simulado)', [
            'ci' => $ci,
            'fecha_nacimiento' => $fechaNacimiento,
        ]);

        // Simular latencia de API externa (1 segundo)
        usleep(800000);

        // Mock: CI con 7+ digitos = valido
        $valido = strlen(preg_replace('/\D/', '', $ci)) >= 7;

        Log::info('CU06: Respuesta SEGIP', [
            'ci' => $ci,
            'verificado' => $valido,
        ]);

        return [
            'verificado' => $valido,
            'fuente' => 'SEGIP_MOCK',
            'mensaje' => $valido ? 'Identidad verificada.' : 'CI no encontrado en SEGIP.',
        ];
    }

    public function verificarSEDUCA(string $ci): array
    {
        // CU06 - Paso 4: C_Ctrl -> B_SEDUCA : + ConsultarBachiller(ci)
        Log::info('CU06: Consultando SEDUCA (simulado)', [
            'ci' => $ci,
        ]);

        // Simular latencia de API externa (0.8 segundo)
        usleep(600000);

        // Mock: siempre retorna bachiller valido
        $valido = true;

        Log::info('CU06: Respuesta SEDUCA', [
            'ci' => $ci,
            'verificado' => $valido,
        ]);

        return [
            'verificado' => $valido,
            'fuente' => 'SEDUCA_MOCK',
            'mensaje' => 'Titulo de bachiller verificado.',
        ];
    }

    public function verificarCompleto(string $ci, string $fechaNacimiento): array
    {
        // CU06 - Paso 2: C_Ctrl -> B_SEGIP : + ConsultarIdentidad(ci)
        $segip = $this->verificarSEGIP($ci, $fechaNacimiento);

        // CU06 - Paso 3: B_SEGIP --> C_Ctrl : + ConfirmacionIdentidad
        if (! $segip['verificado']) {
            Log::warning('CU06: Verificación fallida en SEGIP', ['ci' => $ci]);
            return [
                'aprobado' => false,
                'segip' => $segip,
                'seduca' => null,
                'mensaje' => 'No se pudo validar su información automáticamente. Por favor, acérquese a las oficinas para verificación manual.',
            ];
        }

        // CU06 - Paso 4: C_Ctrl -> B_SEDUCA : + ConsultarBachiller(ci)
        $seduca = $this->verificarSEDUCA($ci);

        // CU06 - Paso 5: B_SEDUCA --> C_Ctrl : + ConfirmacionBachiller
        $aprobado = $segip['verificado'] && $seduca['verificado'];

        if ($aprobado) {
            Log::info('CU06: Verificación completa exitosa', ['ci' => $ci]);
        } else {
            Log::warning('CU06: Verificación fallida en SEDUCA', ['ci' => $ci]);
        }

        return [
            'aprobado' => $aprobado,
            'segip' => $segip,
            'seduca' => $seduca,
            'mensaje' => $aprobado
                ? 'Verificación completa exitosa. Identidad y título de bachiller confirmados.'
                : 'No se pudo validar su información automáticamente. Por favor, acérquese a las oficinas para verificación manual.',
        ];
    }
}

