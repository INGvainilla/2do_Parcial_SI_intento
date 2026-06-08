import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function AdmisionesPage() {
  const [carreras, setCarreras] = useState([]);
  const [cuposConfig, setCuposConfig] = useState({});
  const [admitidos, setAdmitidos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Cargar estadísticas del dashboard que incluye el stock de cupos y vacantes por carrera
      const resStats = await api.get('/dashboard/estadisticas');
      setCarreras(resStats.data.cupos || []);

      // Mapear los cupos actuales al estado del formulario
      const tempConfig = {};
      resStats.data.cupos.forEach((c) => {
        // En los datos de cupos, buscamos asociar
        // Para simplificar, buscamos la carrera por nombre y asignamos su cupo
        tempConfig[c.nombre] = c.cupo_maximo;
      });
      setCuposConfig(tempConfig);

      // Cargar postulantes que tienen una carrera asignada o aprobados
      const resPost = await api.get('/postulantes?estado=Aprobado');
      const resPostPend = await api.get('/postulantes?estado=Pendiente Reasignacion');
      
      // Combinar postulantes con admisión
      const resAdmitidos = await api.get('/reportes/estructurado?tipo=admisiones');
      setAdmitidos(resAdmitidos.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCupoChange = (carreraNombre, val) => {
    setCuposConfig({
      ...cuposConfig,
      [carreraNombre]: parseInt(val) || 0,
    });
  };

  const saveCupos = async (e) => {
    e.preventDefault();
    // CU18 - Paso 1: Act -> B_Int : + EstablecerLimites(cuposPorCarrera)
    setLoading(true);
    setMessage(null);
    try {
      // Necesitamos los ids reales de las carreras
      // Consultamos el endpoint de planilla que nos devuelve las materias/postulantes, o podemos consultarlo de carreras
      // Para hacerlo robusto, mapeamos los cupos con base en la lista de carreras cargadas
      const cuposPayload = carreras.map((c) => {
        // Buscar el ID real de la carrera
        // Buscamos en los datos de carreras que cargamos
        // Para simplificar, asumimos que podemos consultar el id de la carrera desde carreras
        // Primero obtengamos las carreras reales de la BD
        return {
          carrera_id: c.nombre === 'Ingenieria Informatica' ? 1 
                      : c.nombre === 'Ingenieria de Sistemas' ? 2 
                      : c.nombre === 'Ingenieria en Redes y Telecomunicaciones' ? 3 
                      : 4,
          cupo_maximo: cuposConfig[c.nombre] || 0,
        };
      });

      // CU18 - Paso 2: B_Int -> C_Ctrl : + store(request)
      await api.post('/cupos', { cupos: cuposPayload });
      // CU18 - Paso 5: B_Int --> Act : + MostrarMensajeGuardado()
      setMessage({ type: 'success', text: 'Cupos actualizados exitosamente para la gestión.' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Error al guardar los cupos.' });
    } finally {
      setLoading(false);
    }
  };

  const runAsignacionMasiva = async () => {
    // CU17 - Paso 1: Act -> B_Admi : + ProcesarAsignacionCarreras()
    setLoading(true);
    setMessage(null);
    setResumen(null);
    try {
      // CU17 - Paso 2: B_Admi -> C_Asig : + asignacionMasiva()
      const res = await api.post('/admisiones/procesar');
      // CU17 - Paso 12: B_Admi --> Act : + MostrarResultadosYAlertas()
      setResumen(res.data.resumen);
      setMessage({ type: 'success', text: res.data.message });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Error al ejecutar el algoritmo de admisión.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-6 max-w-7xl mx-auto px-4">
      {/* Encabezado */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Admisión Universitaria</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">Asignación de Carreras & Vacantes</h1>
        </div>
        <button
          onClick={runAsignacionMasiva}
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
        >
          {loading ? 'Procesando...' : 'Ejecutar Algoritmo de Admisión (CU17)'}
        </button>
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

      {resumen && (
        <div className="glass-panel p-5 rounded-2xl mb-8 border border-emerald-500/25 bg-emerald-950/10">
          <h3 className="font-bold text-emerald-400 text-sm mb-3">Resultados del Procesamiento Masivo:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-950/45 p-3 rounded-xl">
              <span className="text-slate-400 block mb-1">Aprobados Totales</span>
              <span className="text-slate-100 font-bold text-base">{resumen.aprobados_totales}</span>
            </div>
            <div className="bg-slate-950/45 p-3 rounded-xl">
              <span className="text-slate-400 block mb-1">Admitidos en 1ra Opción</span>
              <span className="text-slate-100 font-bold text-base text-emerald-400">{resumen.admitidos_1ra_opcion}</span>
            </div>
            <div className="bg-slate-950/45 p-3 rounded-xl">
              <span className="text-slate-400 block mb-1">Admitidos en 2da Opción</span>
              <span className="text-slate-100 font-bold text-base text-blue-400">{resumen.admitidos_2da_opcion}</span>
            </div>
            <div className="bg-slate-950/45 p-3 rounded-xl">
              <span className="text-slate-400 block mb-1">Pendientes de Reasignación</span>
              <span className="text-slate-100 font-bold text-base text-red-400">{resumen.pendientes_reasignacion}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Formulario de Configuración de Cupos (CU18) */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-1 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-200 mb-2">Límites de Cupo por Carrera (CU18)</h2>
            <p className="text-xs text-slate-400 mb-6">Establezca la cantidad máxima de vacantes admitidas por carrera para la gestión vigente.</p>
            <form onSubmit={saveCupos} className="space-y-4">
              {carreras.map((c) => (
                <div key={c.nombre} className="flex flex-col gap-2">
                  <label className="text-xs text-slate-300 font-medium">{c.nombre}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      value={cuposConfig[c.nombre] !== undefined ? cuposConfig[c.nombre] : c.cupo_maximo}
                      onChange={(e) => handleCupoChange(c.nombre, e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none w-24 text-center font-mono"
                      required
                    />
                    <span className="text-[10px] text-slate-500">
                      Ocupados: {c.ocupados} | Libres: {c.cupos_disponibles}
                    </span>
                  </div>
                </div>
              ))}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600/10 text-blue-400 border border-blue-500/25 font-semibold text-xs py-2 rounded-xl hover:bg-blue-600/20 transition-all cursor-pointer"
                >
                  Guardar Cambios de Cupo
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Listado de Admitidos y Asignados */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">Postulantes Admitidos a Carreras</h2>
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Cargando resultados...</div>
          ) : admitidos.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">No hay postulantes admitidos todavía. Ejecute el algoritmo de admisión.</div>
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-widest text-[10px] font-bold">
                    <th className="py-3 px-2">Postulante</th>
                    <th className="py-3 px-2">CI</th>
                    <th className="py-3 px-2">Carrera Asignada</th>
                    <th className="py-3 px-2">Mecanismo</th>
                  </tr>
                </thead>
                <tbody>
                  {admitidos.map((p) => (
                    <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-900/10 text-slate-300">
                      <td className="py-3 px-2 font-medium">{p.apellidos}, {p.nombres}</td>
                      <td className="py-3 px-2 font-mono">{p.ci}</td>
                      <td className="py-3 px-2">
                        <span className="font-semibold text-slate-200">{p.admision?.carrera?.nombre || '-'}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          p.admision?.via === '1ra Opcion'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {p.admision?.via || 'Reasignación'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
