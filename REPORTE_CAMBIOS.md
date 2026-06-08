# Reporte de Cambios y Correcciones Realizadas (CU13 - CU18)

Este documento resume los cambios, revisiones y correcciones aplicadas en el sistema de admisiones (Curso Preuniversitario) para solucionar los problemas en el backend (Laravel) y frontend (React), facilitando la comprensión y seguimiento del equipo de desarrollo.

---

## 🛠️ Correcciones en el Backend (Laravel)

### 1. CU13: Edición Individual de Notas y Recálculo en Tiempo Real
* **Archivo modificado:** `backend/app/Http/Controllers/EvaluacionController.php`
* **Cambios realizados:**
  * Se implementó el parámetro `es_edicion` para omitir la regla de excepción E2 cuando el administrador edita manualmente la nota de una materia.
  * Se añadió un método auxiliar privado llamado `actualizarEstadoDeUnPostulante($postulanteId)` para centralizar y recalcular el promedio final de las 4 materias de un postulante, determinando su estado global (`Aprobado` o `Reprobado`) de forma inmediata.
  * Este helper ahora es invocado de manera síncrona en la **edición individual (CU13)** y en la **carga masiva por CSV (CU14)**, garantizando que los estados globales se actualicen en tiempo real en la base de datos sin depender de procesos manuales posteriores.

### 2. CU16: Determinar Estados Global
* **Archivo modificado:** `backend/app/Http/Controllers/EvaluacionController.php`
* **Cambios realizados:**
  * Se amplió el filtro de selección de postulantes de solo `En Evaluacion` a incluir también los estados `Aprobado` y `Reprobado` (`whereIn`). Esto permite que al re-evaluar se consideren los postulantes cuyas notas fueron modificadas posteriormente.
  * Se refactorizó la lógica para utilizar el helper `actualizarEstadoDeUnPostulante()`, eliminando código duplicado.
  * Se corrigió el contador de la respuesta del endpoint para reportar los totales reales de aprobados y reprobados evaluados.

### 3. CU17: Asignación de Carreras (Admisiones)
* **Archivos modificados:**
  * `backend/app/Http/Controllers/AsignacionCarreraController.php`
  * `backend/app/Http/Controllers/ReporteController.php` (lógica duplicada)
* **Cambios realizados:**
  * **Error de Columna Inexistente (`promedio_general`):** Laravel intentaba guardar el atributo dinámico `promedio_general` al hacer `$postulante->update()`. Se corrigió utilizando `Postulante::where('id', $postulante->id)->update(...)` con los campos específicos de la tabla.
  * **Error de Bitácora de Accesos (`bitacora_accesos`):** Se corrigieron las columnas en el insert de la bitácora: se cambió `'accion'` por `'action'` y se eliminaron las referencias a columnas que no existen en la base de datos (`descripcion`, `user_agent`).
  * **Inclusión de Pendientes de Reasignación:** Se modificó la consulta para incluir postulantes en estado `Pendiente Reasignacion` además de los `Aprobado` al momento de asignar cupos, resolviendo el problema de postulantes invisibles en segundas vueltas de asignación.

### 4. CU18 & Dashboard: Visualización de Cupos de Carrera
* **Archivo modificado:** `backend/app/Http/Controllers/ReporteController.php`
* **Cambios realizados:**
  * Se cambió la consulta de cupos de `join` a `leftJoin` entre las tablas `carreras` y `cupos_gestion`, implementando un `COALESCE` para retornar `0` en cupos cuando no existan registros previos de cupo para una carrera en la gestión seleccionada. Esto previene que carreras queden ocultas o vacías en la UI del panel.

---

## 💻 Correcciones en el Frontend (React)

### 1. Admisiones y Resultados de Asignación (CU17)
* **Archivo modificado:** `frontend/src/pages/admin/AdmisionesPage.jsx`
* **Cambios realizados:**
  * **Mapeo de Datos:** Se corrigió la lectura de la respuesta del endpoint de admitidos. El frontend buscaba `resAdmitidos.data.postulantes`, pero la API del backend retorna la lista dentro de la propiedad `data` (estructura: `{ titulo, fecha, tipo, data }`). Se cambió a `resAdmitidos.data.data` para que se rendericen correctamente los estudiantes admitidos en la interfaz.

---

## 📝 Resumen del Flujo de Datos Actualizado
1. **Modificación de Notas (CU13) / Carga CSV (CU14)** ➔ Recálculo automático del Promedio y Estado (`Aprobado`/`Reprobado`) ➔ Registro de Auditoría de Notas.
2. **Procesar Admisiones (CU17)** ➔ Lee postulantes `Aprobado` y `Pendiente Reasignacion` ➔ Compara con los cupos configurados de la carrera ➔ Pasa postulantes a `Admitido` (si hay cupo) o a `Pendiente Reasignacion` (si se agotan los cupos) ➔ Registra el acceso en la Bitácora.
