-- ==============================================================================
-- SISTEMA WEB DE GESTIÓN DEL PROCESO DE ADMISIÓN (CUP) - FICCT UAGRM
-- SCRIPT DE CREACIÓN DE BASE DE DATOS (POSTGRESQL)
-- ==============================================================================

-- ---------------------------------------------------------
-- 1. TABLAS CATÁLOGO Y CONFIGURACIÓN (Sin dependencias FK)
-- ---------------------------------------------------------

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gestiones_academicas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL, -- Ej: '1-2026'
    nombre VARCHAR(50) NOT NULL,
    fecha_inicio DATE,
    fecha_fin DATE,
    estado VARCHAR(20) DEFAULT 'ACTIVA',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE carreras (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(20) UNIQUE,
    descripcion TEXT,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE materias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    codigo VARCHAR(10) UNIQUE,
    activa BOOLEAN DEFAULT TRUE
);

CREATE TABLE aulas (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(20) NOT NULL,
    capacidad INT NOT NULL,
    ubicacion VARCHAR(50),
    disponible BOOLEAN DEFAULT TRUE
);

CREATE TABLE requisitos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    obligatorio BOOLEAN DEFAULT TRUE
);

-- ---------------------------------------------------------
-- 2. TABLAS PRINCIPALES DE USUARIO Y SEGURIDAD
-- ---------------------------------------------------------

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    ci VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INT REFERENCES roles(id) ON DELETE RESTRICT,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    ultimo_acceso TIMESTAMP,
    intentos_fallidos INT DEFAULT 0,
    token_sesion VARCHAR(500),
    eliminado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bitacora_accesos (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    accion VARCHAR(20) NOT NULL, -- 'LOGIN', 'LOGOUT'
    direccion_ip VARCHAR(45),
    user_agent TEXT,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 3. TABLAS DE NEGOCIO (Dependencias nivel 2)
-- ---------------------------------------------------------

CREATE TABLE cupos_carreras (
    id SERIAL PRIMARY KEY,
    carrera_id INT REFERENCES carreras(id) ON DELETE CASCADE,
    gestion_id INT REFERENCES gestiones_academicas(id) ON DELETE CASCADE,
    cupo_maximo INT NOT NULL,
    cupo_ocupado INT DEFAULT 0,
    UNIQUE(carrera_id, gestion_id)
);

CREATE TABLE postulantes (
    id SERIAL PRIMARY KEY,
    codigo_postulante VARCHAR(20) UNIQUE,
    ci VARCHAR(20) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    sexo VARCHAR(10),
    direccion VARCHAR(255),
    ciudad VARCHAR(50),
    telefono VARCHAR(20),
    email VARCHAR(150),
    colegio_procedencia VARCHAR(150),
    titulo_bachiller_url VARCHAR(255),
    primera_opcion_carrera_id INT REFERENCES carreras(id),
    segunda_opcion_carrera_id INT REFERENCES carreras(id),
    turno_preferencia VARCHAR(10),
    gestion_id INT REFERENCES gestiones_academicas(id),
    estado VARCHAR(30) DEFAULT 'PREINSCRITO',
    es_recurrente BOOLEAN DEFAULT FALSE,
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    eliminado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE docentes (
    id SERIAL PRIMARY KEY,
    ci VARCHAR(20) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    especialidad VARCHAR(50),
    grado_academico VARCHAR(50),
    email VARCHAR(150),
    telefono VARCHAR(20),
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE grupos (
    id SERIAL PRIMARY KEY,
    numero_grupo INT NOT NULL,
    gestion_id INT REFERENCES gestiones_academicas(id) ON DELETE CASCADE,
    turno VARCHAR(10) NOT NULL,
    aula_id INT REFERENCES aulas(id),
    cantidad_estudiantes INT DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'ABIERTO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(numero_grupo, gestion_id)
);

-- ---------------------------------------------------------
-- 4. TABLAS TRANSACCIONALES E INTERMEDIAS
-- ---------------------------------------------------------

CREATE TABLE pagos (
    id SERIAL PRIMARY KEY,
    postulante_id INT REFERENCES postulantes(id) ON DELETE CASCADE,
    monto DECIMAL(10,2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'BOB',
    stripe_payment_id VARCHAR(255),
    estado_pago VARCHAR(30) NOT NULL, -- Ej: 'COMPLETADO'
    metodo_pago VARCHAR(50),
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    respuesta_pasarela TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE requisitos_postulantes (
    id SERIAL PRIMARY KEY,
    postulante_id INT REFERENCES postulantes(id) ON DELETE CASCADE,
    requisito_id INT REFERENCES requisitos(id) ON DELETE CASCADE,
    cumplido BOOLEAN DEFAULT FALSE,
    documento_url VARCHAR(255),
    fecha_verificacion TIMESTAMP,
    UNIQUE(postulante_id, requisito_id)
);

CREATE TABLE postulantes_grupos (
    id SERIAL PRIMARY KEY,
    postulante_id INT REFERENCES postulantes(id) ON DELETE CASCADE,
    grupo_id INT REFERENCES grupos(id) ON DELETE CASCADE,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(postulante_id, grupo_id) -- Evita asignaciones duplicadas al mismo grupo
);

CREATE TABLE asignaciones_docentes (
    id SERIAL PRIMARY KEY,
    docente_id INT REFERENCES docentes(id) ON DELETE CASCADE,
    grupo_id INT REFERENCES grupos(id) ON DELETE CASCADE,
    materia_id INT REFERENCES materias(id) ON DELETE CASCADE,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(docente_id, grupo_id, materia_id)
);

-- ---------------------------------------------------------
-- 5. TABLAS DE EVALUACIÓN Y NOTAS
-- ---------------------------------------------------------

CREATE TABLE examenes (
    id SERIAL PRIMARY KEY,
    postulante_id INT REFERENCES postulantes(id) ON DELETE CASCADE,
    materia_id INT REFERENCES materias(id) ON DELETE CASCADE,
    grupo_id INT REFERENCES grupos(id) ON DELETE CASCADE,
    numero_examen INT CHECK (numero_examen IN (1, 2, 3)),
    nota DECIMAL(5,2) CHECK (nota >= 0 AND nota <= 100),
    ponderacion DECIMAL(5,2) NOT NULL,
    fecha_aplicacion DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(postulante_id, materia_id, numero_examen)
);

CREATE TABLE auditoria_notas (
    id SERIAL PRIMARY KEY,
    examen_id INT REFERENCES examenes(id) ON DELETE CASCADE,
    usuario_modificador_id INT REFERENCES usuarios(id),
    nota_anterior DECIMAL(5,2),
    nota_nueva DECIMAL(5,2),
    motivo TEXT,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resultados_materias (
    id SERIAL PRIMARY KEY,
    postulante_id INT REFERENCES postulantes(id) ON DELETE CASCADE,
    materia_id INT REFERENCES materias(id) ON DELETE CASCADE,
    nota_examen1 DECIMAL(5,2) DEFAULT 0,
    nota_examen2 DECIMAL(5,2) DEFAULT 0,
    nota_examen3 DECIMAL(5,2) DEFAULT 0,
    promedio_ponderado DECIMAL(5,2) DEFAULT 0,
    estado_materia VARCHAR(15), -- 'APROBADO', 'REPROBADO'
    UNIQUE(postulante_id, materia_id)
);

CREATE TABLE resultados_finales (
    id SERIAL PRIMARY KEY,
    postulante_id INT REFERENCES postulantes(id) ON DELETE CASCADE,
    gestion_id INT REFERENCES gestiones_academicas(id) ON DELETE CASCADE,
    promedio_general DECIMAL(5,2),
    estado_final VARCHAR(15), -- 'APROBADO', 'REPROBADO'
    fecha_calculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(postulante_id, gestion_id)
);

-- ---------------------------------------------------------
-- 6. TABLAS DE ADMISIÓN Y COMUNICACIÓN
-- ---------------------------------------------------------

CREATE TABLE admisiones (
    id SERIAL PRIMARY KEY,
    postulante_id INT REFERENCES postulantes(id) ON DELETE CASCADE,
    carrera_asignada_id INT REFERENCES carreras(id) ON DELETE RESTRICT,
    gestion_id INT REFERENCES gestiones_academicas(id) ON DELETE CASCADE,
    mecanismo_asignacion VARCHAR(50), -- 'Primera opción', 'Segunda opción'
    fecha_admision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(postulante_id, gestion_id)
);

CREATE TABLE notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(50) NOT NULL,
    mensaje TEXT NOT NULL,
    estado VARCHAR(15) DEFAULT 'NO_LEIDA',
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura TIMESTAMP
);

CREATE TABLE conversaciones_chatbot (
    id SERIAL PRIMARY KEY,
    postulante_id INT REFERENCES postulantes(id) ON DELETE CASCADE,
    pregunta TEXT NOT NULL,
    respuesta TEXT,
    resuelta BOOLEAN DEFAULT FALSE,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 7. ÍNDICES DE RENDIMIENTO
-- ---------------------------------------------------------

CREATE INDEX idx_postulantes_ci ON postulantes(ci);
CREATE INDEX idx_postulantes_estado ON postulantes(estado);
CREATE INDEX idx_postulantes_primera_opcion ON postulantes(primera_opcion_carrera_id);
CREATE INDEX idx_postulantes_segunda_opcion ON postulantes(segunda_opcion_carrera_id);
CREATE INDEX idx_examenes_postulante ON examenes(postulante_id);
CREATE INDEX idx_resultados_materias_postulante ON resultados_materias(postulante_id);
CREATE INDEX idx_postulantes_grupos_postulante ON postulantes_grupos(postulante_id);
CREATE INDEX idx_pagos_postulante ON pagos(postulante_id);
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);

-- ==============================================================================
-- DICCIONARIO Y EXPLICACIÓN DE RESTRICCIONES (CONSTRAINTS) Y PALABRAS CLAVE:
-- ==============================================================================
/*
1. PRIMARY KEY: Define la clave primaria de la tabla (identificador único para cada registro). Al usar "SERIAL" en PostgreSQL, este número se autoincrementa automáticamente.

2. FOREIGN KEY (REFERENCES): Establece una relación entre dos tablas. Por ejemplo, `rol_id INT REFERENCES roles(id)` asegura que no puedes asignar a un usuario un rol que no existe en la tabla roles.

3. ON DELETE CASCADE / RESTRICT / SET NULL:
   - CASCADE: Si borras el registro padre (ej. un Postulante), se borran automáticamente todos sus registros hijos (sus pagos, sus notas). Ayuda a no dejar datos "huérfanos".
   - RESTRICT: Impide borrar el registro padre si tiene hijos. (Ej: No puedes borrar un Rol si hay usuarios usándolo).
   - SET NULL: Si borras el padre, el hijo no se borra, pero su campo FK queda en NULL. (Ej: Si borras un Usuario del sistema, el Postulante sigue existiendo, pero su campo usuario_id queda en blanco).

4. UNIQUE: Garantiza que un valor no se repita en toda la tabla.
   - En una columna: `ci VARCHAR(20) UNIQUE` asegura que nadie tenga el mismo carnet.
   - Compuesto: `UNIQUE(postulante_id, materia_id, numero_examen)` asegura que un alumno no pueda tener dos "Examen 1" en la materia "Matemáticas". Esto previene errores de lógica académica.

5. CHECK: Es una validación a nivel de base de datos.
   - `CHECK (nota >= 0 AND nota <= 100)`: Impide, a nivel de motor de BD, que alguien inserte un -5 o un 120 como nota. Es una doble barrera de seguridad, independientemente de Laravel.

6. TIMESTAMP: Guarda la fecha y la hora exacta de un evento.
   - `DEFAULT CURRENT_TIMESTAMP`: Hace que si insertas un dato y no especificas la fecha, PostgreSQL ponga automáticamente la fecha y hora del servidor en ese mismo instante.

7. BOOLEAN DEFAULT FALSE / TRUE: Sirve para usar banderas (flags) como `eliminado` o `activo`.
*/
