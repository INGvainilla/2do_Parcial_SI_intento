import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function NotasAdminPage() {
  const [materiaId, setMateriaId] = useState('');
  const [numeroExamen, setNumeroExamen] = useState('1');
  const [file, setFile] = useState(null);
  const [materias, setMaterias] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [grupoId, setGrupoId] = useState('');
  const [postulantes, setPostulantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Modal para edición individual
  const [editModal, setEditModal] = useState(false);
  const [selectedPostulante, setSelectedPostulante] = useState(null);
  const [selectedMateria, setSelectedMateria] = useState(null);
  const [selectedExamenNum, setSelectedExamenNum] = useState('1');
  const [editNota, setEditNota] = useState('');
  const [editMotivo, setEditMotivo] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  const fetchCatalogos = async () => {
    try {
      const resM = await api.get('/evaluaciones/planilla');
      setMaterias(resM.data.materias || []);
      
      const resG = await api.get('/grupos');
      setGrupos(resG.data || []);
      if (resG.data.length > 0) {
        setGrupoId(resG.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPlanilla = async () => {
    if (!grupoId) return;
    setLoading(true);
    try {
      const res = await api.get(`/evaluaciones/planilla?grupo_id=${grupoId}`);
      setPostulantes(res.data.postulantes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogos();
  }, []);

  useEffect(() => {
    fetchPlanilla();
  }, [grupoId]);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file || !materiaId || !numeroExamen) {
      setMessage({ type: 'error', text: 'Por favor complete todos los campos de carga masiva.' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('materia_id', materiaId);
    formData.append('numero_examen', numeroExamen);

    // CU14 - Paso 1: Act -> B_Nota : + CargarArchivoCSV(file)
    setLoading(true);
    setMessage(null);
    try {
      // CU14 - Paso 2: B_Nota -> C_Eval : + storeMasivo(request)
      const res = await api.post('/evaluaciones/cargar-masiva', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // CU14 - Paso 10: B_Nota --> Act : + MostrarResumenCarga()
      setMessage({
        type: 'success',
        text: `Carga finalizada con éxito. Procesados: ${res.data.exitos} alumnos. Errores: ${res.data.errores.length}`,
      });
      fetchPlanilla();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Error al procesar carga masiva.' });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (postulante, materia, examNum, currentNota) => {
    setSelectedPostulante(postulante);
    setSelectedMateria(materia);
    setSelectedExamenNum(examNum);
    setEditNota(currentNota !== '-' ? currentNota : '');
    setIsEditMode(currentNota !== '-');
    setEditMotivo('');
    setEditModal(true);
  };

  const handleIndividualEdit = async (e) => {
    e.preventDefault();
    if (!editNota || !editMotivo) {
      alert('Por favor complete la nota y el motivo.');
      return;
    }

    // CU13 - Paso 1: Act -> B_Int : + ModificarNota(postulanteId, materiaId, numeroExamen, nuevaNota)
    setLoading(true);
    try {
      // CU13 - Paso 2: B_Int -> C_Ctrl : + update(request)
      await api.post('/evaluaciones/nota-individual', {
        postulante_id: selectedPostulante.id,
        materia_id: selectedMateria.id,
        numero_examen: selectedExamenNum,
        nota: parseFloat(editNota),
        motivo: editMotivo,
        es_edicion: isEditMode, // Bypass E2 exception only if it's genuinely an edit
      });
      setEditModal(false);
      // CU13 - Paso 8: B_Int --> Act : + ActualizarPlanillaNotas()
      fetchPlanilla();
      setMessage({ type: 'success', text: 'Nota actualizada exitosamente.' });
    } catch (err) {
      alert(err.response?.data?.message || 'Error al actualizar la nota.');
    } finally {
      setLoading(false);
    }
  };

  const runCalculoPromedios = async () => {
    // CU15 - Paso 1: Act -> B_Console : + ejecutarCalculoGlobal()
    setLoading(true);
    setMessage(null);
    try {
      // CU15 - Paso 2: B_Console -> C_Ctrl : + calcularPromedios()
      const res = await api.post('/evaluaciones/calcular-promedios-global');
      // CU15 - Paso 8: B_Console --> Act : + MostrarResumenConsola()
      setMessage({ type: 'success', text: res.data.message });
      fetchPlanilla();
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al ejecutar el cálculo de promedios.' });
    } finally {
      setLoading(false);
    }
  };

  const runDeterminacionEstados = async () => {
    // CU16 - Paso 1: Act -> B_Console : + ejecutarDeterminacionEstado()
    setLoading(true);
    setMessage(null);
    try {
      // CU16 - Paso 2: B_Console -> C_Ctrl : + evaluarEstados()
      const res = await api.post('/evaluaciones/evaluar-estados-global');
      // CU16 - Paso 8: B_Console --> Act : + MostrarResumenConsola()
      setMessage({ type: 'success', text: `Estados determinados. Aprobados: ${res.data.aprobados}, Reprobados: ${res.data.reprobados}` });
      fetchPlanilla();
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al determinar los estados académicos.' });
    } finally {
      setLoading(false);
    }
  };

  const runAsignacionCarreras = async () => {
    // CU17 - Paso 1: Act -> B_Admi : + ejecutarAsignacion()
    setLoading(true);
    setMessage(null);
    try {
      // CU17 - Paso 2: B_Admi -> C_Asig : + asignacionMasiva()
      const res = await api.post('/admisiones/procesar');
      const stats = res.data.estadisticas;
      setMessage({ 
        type: 'success', 
        text: `Asignación completada. Procesados: ${stats.procesados} | 1ra Opción: ${stats.admitidos_1ra_opcion} | 2da Opción: ${stats.admitidos_2da_opcion} | Pendientes: ${stats.pendientes_reasignacion}` 
      });
      fetchPlanilla();
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al ejecutar la asignación de carreras.' });
    } finally {
      setLoading(false);
    }
  };

  const getNotaExamen = (postulante, materiaId, numExamen) => {
    const ex = postulante.examenes.find(
      (e) => e.materia_id === materiaId && e.numero_examen === numExamen
    );
    return ex ? ex.nota : '-';
  };

  const getPromedioFinal = (postulante, materiaId) => {
    const nf = postulante.notas_finales.find((n) => n.materia_id === materiaId);
    // Mostrar observaciones (ej. "Incompleto - faltan 2 exámenes") si existe
    if (nf && nf.observaciones) {
      return `${nf.promedio} \n ${nf.observaciones}`;
    }
    return nf ? nf.promedio : '-';
  };

  return (
    <div className="py-6 max-w-7xl mx-auto px-4">
      {/* Encabezado */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Módulo Académico</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">Gestión de Calificaciones del CUP</h1>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button 
            onClick={runCalculoPromedios}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 text-xs font-semibold hover:bg-blue-600/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            Calcular Promedios Ponderados (CU15)
          </button>
          <button 
            onClick={runDeterminacionEstados}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-600/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            Determinar Aprobados/Reprobados (CU16)
          </button>
          <button 
            onClick={runAsignacionCarreras}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-purple-600/10 text-purple-400 border border-purple-500/20 text-xs font-semibold hover:bg-purple-600/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            Asignar Carreras por Cupo (CU17)
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl mb-6 border text-sm ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Carga Masiva (CU14) */}
      <div className="glass-panel p-6 rounded-2xl mb-8">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Carga Masiva de Notas (CU14)</h2>
        <form onSubmit={handleFileUpload} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Materia</label>
            <select
              value={materiaId}
              onChange={(e) => setMateriaId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none"
            >
              <option value="">Seleccione Materia</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Examen</label>
            <select
              value={numeroExamen}
              onChange={(e) => setNumeroExamen(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none"
            >
              <option value="1">Primer Parcial (30%)</option>
              <option value="2">Segundo Parcial (30%)</option>
              <option value="3">Examen Final (40%)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Archivo CSV (ci,nota)</label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-400 focus:border-blue-500 outline-none file:mr-4 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20 cursor-pointer"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold text-xs py-2.5 rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Subir e Importar Notas
          </button>
        </form>
      </div>

      {/* Planilla de Calificaciones Interactiva */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-200">Planilla de Notas por Grupo</h2>
          <div>
            <select
              value={grupoId}
              onChange={(e) => setGrupoId(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 outline-none"
            >
              <option value="">Seleccione Grupo</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>Grupo {g.numero} ({g.turno})</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Cargando calificaciones...</div>
        ) : postulantes.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">No hay postulantes en este grupo.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-widest text-[10px] font-bold">
                  <th className="py-3 px-2">Postulante (CI)</th>
                  <th className="py-3 px-2">Estado</th>
                  {materias.map((m) => (
                    <th key={m.id} className="py-3 px-2 border-l border-slate-850 text-center" colSpan="4">
                      {m.nombre}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-slate-800 text-slate-500 font-bold">
                  <th className="py-2 px-2">Nombres</th>
                  <th className="py-2 px-2"></th>
                  {materias.map((m) => (
                    <>
                      <th key={`${m.id}-p1`} className="py-2 px-1 border-l border-slate-850 text-center w-10">P1</th>
                      <th key={`${m.id}-p2`} className="py-2 px-1 text-center w-10">P2</th>
                      <th key={`${m.id}-ef`} className="py-2 px-1 text-center w-10">EF</th>
                      <th key={`${m.id}-pf`} className="py-2 px-1 text-center w-12 bg-slate-900/30 text-slate-400">PF</th>
                    </>
                  ))}
                </tr>
              </thead>
              <tbody>
                {postulantes.map((p) => (
                  <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-900/20 text-slate-300">
                    <td className="py-3 px-2 font-medium">
                      <div>{p.apellidos}, {p.nombres}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{p.ci}</div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        p.estado === 'Aprobado' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : p.estado === 'Reprobado'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {p.estado}
                      </span>
                    </td>
                    {materias.map((m) => {
                      const p1 = getNotaExamen(p, m.id, 1);
                      const p2 = getNotaExamen(p, m.id, 2);
                      const ef = getNotaExamen(p, m.id, 3);
                      const pf = getPromedioFinal(p, m.id);

                      return (
                        <>
                          {/* Examen 1 */}
                          <td 
                            onClick={() => openEditModal(p, m, 1, p1)}
                            className="py-3 px-1 border-l border-slate-850 text-center cursor-pointer hover:bg-blue-600/15 transition-colors font-mono"
                          >
                            {p1}
                          </td>
                          {/* Examen 2 */}
                          <td 
                            onClick={() => openEditModal(p, m, 2, p2)}
                            className="py-3 px-1 text-center cursor-pointer hover:bg-blue-600/15 transition-colors font-mono"
                          >
                            {p2}
                          </td>
                          {/* Examen Final */}
                          <td 
                            onClick={() => openEditModal(p, m, 3, ef)}
                            className="py-3 px-1 text-center cursor-pointer hover:bg-blue-600/15 transition-colors font-mono"
                          >
                            {ef}
                          </td>
                          {/* Promedio Final */}
                          <td className={`py-3 px-1 text-center font-bold font-mono bg-slate-900/30 ${
                            pf !== '-' && pf >= 60 ? 'text-emerald-400' : pf !== '-' ? 'text-red-400' : 'text-slate-500'
                          }`}>
                            {pf}
                          </td>
                        </>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Modificación Individual (CU13) */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl max-w-md w-full border border-slate-800 bg-slate-900">
            <h3 className="text-base font-bold text-slate-100 mb-2">Modificar Calificación (CU13)</h3>
            <p className="text-xs text-slate-400 mb-6">
              Postulante: <span className="text-slate-200 font-semibold">{selectedPostulante?.nombres} {selectedPostulante?.apellidos}</span><br />
              Materia: <span className="text-slate-200 font-semibold">{selectedMateria?.nombre}</span> | Examen: <span className="text-slate-200 font-semibold">{selectedExamenNum}</span>
            </p>
            <form onSubmit={handleIndividualEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Calificación (0 - 100)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={editNota}
                  onChange={(e) => setEditNota(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none font-mono"
                  placeholder="Ingrese nota"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Motivo del Cambio (Auditoría)</label>
                <textarea
                  value={editMotivo}
                  onChange={(e) => setEditMotivo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none h-20"
                  placeholder="Describa el motivo de la modificación"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Guardar Calificación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
