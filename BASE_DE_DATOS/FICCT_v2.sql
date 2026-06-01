-- DDL DE CREACION DE BASE DE DATOS - SISTEMA CUP FICCT
-- MOTOR: PostgreSQL 16+

BEGIN;

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Administrador', 'Coordinador', 'Docente', 'Postulante')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bitacora_accesos (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    action VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE gestiones (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    activa BOOLEAN DEFAULT FALSE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE carreras (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    codigo VARCHAR(10) UNIQUE NOT NULL
);

CREATE TABLE cupos_gestion (
    id BIGSERIAL PRIMARY KEY,
    gestion_id BIGINT NOT NULL,
    carrera_id BIGINT NOT NULL,
    cupo_maximo INT NOT NULL CHECK (cupo_maximo >= 0),
    cupos_disponibles INT NOT NULL CHECK (cupos_disponibles >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gestion_id) REFERENCES gestiones(id) ON DELETE CASCADE,
    FOREIGN KEY (carrera_id) REFERENCES carreras(id) ON DELETE CASCADE,
    UNIQUE (gestion_id, carrera_id)
);

CREATE TABLE postulantes (
    id BIGSERIAL PRIMARY KEY,
    ci VARCHAR(20) UNIQUE NOT NULL,
    nombres VARCHAR(150) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    sexo CHAR(1) NOT NULL CHECK (sexo IN ('M', 'F')),
    direccion VARCHAR(255),
    telefono VARCHAR(20),
    email VARCHAR(150) NOT NULL,
    colegio_procedencia VARCHAR(150),
    ciudad VARCHAR(100) DEFAULT 'Santa Cruz de la Sierra',
    titulo_bachiller VARCHAR(255),
    primera_opcion_id BIGINT NOT NULL,
    segunda_opcion_id BIGINT NOT NULL,
    turno_preferencia VARCHAR(20) NOT NULL CHECK (turno_preferencia IN ('Manana', 'Tarde', 'Noche')),
    gestion_id BIGINT NOT NULL,
    estado VARCHAR(50) DEFAULT 'Preinscrito' CHECK (
        estado IN ('Preinscrito', 'Verificado', 'Inscrito', 'En Evaluacion', 'Aprobado', 'Reprobado', 'Pendiente Reasignacion')
    ),
    recurrente BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (primera_opcion_id) REFERENCES carreras(id),
    FOREIGN KEY (segunda_opcion_id) REFERENCES carreras(id),
    FOREIGN KEY (gestion_id) REFERENCES gestiones(id),
    CONSTRAINT chk_opciones_diferentes CHECK (primera_opcion_id <> segunda_opcion_id)
);

CREATE TABLE requisitos_documentales (
    id BIGSERIAL PRIMARY KEY,
    postulante_id BIGINT UNIQUE NOT NULL,
    ci_digitalizado BOOLEAN DEFAULT FALSE,
    certificado_nacimiento BOOLEAN DEFAULT FALSE,
    titulo_bachiller_legalizado BOOLEAN DEFAULT FALSE,
    formulario_preinscripcion BOOLEAN DEFAULT FALSE,
    verificado_bd_externa BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (postulante_id) REFERENCES postulantes(id) ON DELETE CASCADE
);

CREATE TABLE pagos (
    id BIGSERIAL PRIMARY KEY,
    postulante_id BIGINT NOT NULL,
    stripe_checkout_id VARCHAR(255) UNIQUE NOT NULL,
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    estado_pago VARCHAR(50) NOT NULL,
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (postulante_id) REFERENCES postulantes(id) ON DELETE CASCADE
);

CREATE TABLE materias (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    codigo VARCHAR(10) UNIQUE NOT NULL
);

CREATE TABLE aulas (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    capacidad INT NOT NULL CHECK (capacidad > 0),
    ubicacion VARCHAR(100)
);

CREATE TABLE grupos (
    id BIGSERIAL PRIMARY KEY,
    numero INT NOT NULL,
    gestion_id BIGINT NOT NULL,
    turno VARCHAR(20) NOT NULL CHECK (turno IN ('Manana', 'Tarde', 'Noche')),
    aula_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gestion_id) REFERENCES gestiones(id) ON DELETE CASCADE,
    FOREIGN KEY (aula_id) REFERENCES aulas(id),
    UNIQUE (gestion_id, turno, numero)
);

CREATE TABLE asignaciones_grupo (
    id BIGSERIAL PRIMARY KEY,
    postulante_id BIGINT UNIQUE NOT NULL,
    grupo_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (postulante_id) REFERENCES postulantes(id) ON DELETE CASCADE,
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE
);

CREATE TABLE docentes (
    id BIGSERIAL PRIMARY KEY,
    ci VARCHAR(20) UNIQUE NOT NULL,
    nombres VARCHAR(150) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    especialidad VARCHAR(100) NOT NULL,
    grado_academico VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE asignaciones_docente (
    id BIGSERIAL PRIMARY KEY,
    docente_id BIGINT NOT NULL,
    grupo_id BIGINT NOT NULL,
    materia_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE CASCADE,
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
    UNIQUE (grupo_id, materia_id)
);

CREATE TABLE examenes (
    id BIGSERIAL PRIMARY KEY,
    postulante_id BIGINT NOT NULL,
    materia_id BIGINT NOT NULL,
    numero_examen INT NOT NULL CHECK (numero_examen IN (1, 2, 3)),
    nota DECIMAL(5,2) NOT NULL CHECK (nota BETWEEN 0 AND 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (postulante_id) REFERENCES postulantes(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
    UNIQUE (postulante_id, materia_id, numero_examen)
);

CREATE TABLE notas_finales (
    id BIGSERIAL PRIMARY KEY,
    postulante_id BIGINT NOT NULL,
    materia_id BIGINT NOT NULL,
    promedio DECIMAL(5,2) NOT NULL CHECK (promedio BETWEEN 0 AND 100),
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('APROBADO', 'REPROBADO')),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (postulante_id) REFERENCES postulantes(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
    UNIQUE (postulante_id, materia_id)
);

CREATE TABLE admisiones (
    id BIGSERIAL PRIMARY KEY,
    postulante_id BIGINT UNIQUE NOT NULL,
    carrera_id BIGINT NOT NULL,
    via VARCHAR(50) NOT NULL CHECK (via IN ('1ra Opcion', '2da Opcion', 'Reasignacion Administrativa')),
    fecha_admision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (postulante_id) REFERENCES postulantes(id) ON DELETE CASCADE,
    FOREIGN KEY (carrera_id) REFERENCES carreras(id)
);

CREATE TABLE preguntas_simulacro (
    id BIGSERIAL PRIMARY KEY,
    materia_id BIGINT NOT NULL,
    enunciado TEXT NOT NULL,
    opciones TEXT NOT NULL,
    respuesta_correcta VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE
);

CREATE INDEX idx_postulantes_ci ON postulantes(ci);
CREATE INDEX idx_postulantes_estado ON postulantes(estado);
CREATE INDEX idx_postulantes_primera_opcion ON postulantes(primera_opcion_id);
CREATE INDEX idx_postulantes_segunda_opcion ON postulantes(segunda_opcion_id);
CREATE INDEX idx_examenes_postulante ON examenes(postulante_id);
CREATE INDEX idx_notas_finales_postulante ON notas_finales(postulante_id);
CREATE INDEX idx_asignaciones_grupo_postulante ON asignaciones_grupo(postulante_id);
CREATE INDEX idx_preguntas_simulacro_materia ON preguntas_simulacro(materia_id);

COMMIT;
