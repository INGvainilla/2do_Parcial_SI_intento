-- Migracion incremental segura para esquema actual CUP FICCT
-- Objetivo: aplicar mejoras sin reiniciar la base ni perder datos.
-- Motor: PostgreSQL 16+

BEGIN;

-- 1) Corregir restriccion defectuosa en postulantes_grupos.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'postulantes_grupos'
          AND c.conname = 'postulantes_grupos_postulante_id_gestion_id_key'
    ) THEN
        ALTER TABLE postulantes_grupos
            DROP CONSTRAINT postulantes_grupos_postulante_id_gestion_id_key;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'postulantes_grupos'
          AND c.conname = 'postulantes_grupos_postulante_id_grupo_id_key'
    ) THEN
        ALTER TABLE postulantes_grupos
            ADD CONSTRAINT postulantes_grupos_postulante_id_grupo_id_key
            UNIQUE (postulante_id, grupo_id);
    END IF;
END $$;

-- 2) Crear indices utiles si no existen.
CREATE INDEX IF NOT EXISTS idx_postulantes_ci ON postulantes(ci);
CREATE INDEX IF NOT EXISTS idx_postulantes_estado ON postulantes(estado);
CREATE INDEX IF NOT EXISTS idx_postulantes_primera_opcion ON postulantes(primera_opcion_carrera_id);
CREATE INDEX IF NOT EXISTS idx_postulantes_segunda_opcion ON postulantes(segunda_opcion_carrera_id);
CREATE INDEX IF NOT EXISTS idx_examenes_postulante ON examenes(postulante_id);
CREATE INDEX IF NOT EXISTS idx_resultados_materias_postulante ON resultados_materias(postulante_id);
CREATE INDEX IF NOT EXISTS idx_postulantes_grupos_postulante ON postulantes_grupos(postulante_id);
CREATE INDEX IF NOT EXISTS idx_pagos_postulante ON pagos(postulante_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);

COMMIT;

-- Validacion sugerida:
-- \d postulantes_grupos
-- \di idx_postulantes_ci
