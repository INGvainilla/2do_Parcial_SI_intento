import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [postulanteInfo, setPostulanteInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    // CU22 - Paso 1: Act -> B_Dash : + AbrirDashboard()
    try {
      if (['Administrador', 'Coordinador', 'Docente'].includes(user?.role)) {
        // CU22 - Paso 2: B_Dash -> C_Rep : + getEstadisticas()
        const res = await api.get('/dashboard/estadisticas');
        // CU22 - Paso 9: C_Rep --> B_Dash : + EnviarDatosEstadisticos()
        setStats(res.data);
      } else if (user?.role === 'Postulante') {
        // Cargar información del postulante logueado
        // Buscamos al postulante por su CI (que usualmente se guarda en el name o podemos buscar por CI)
        // O cargamos el expediente a través de api/me o buscando por CI
        // Busquemos usando el CI que está en la cuenta de usuario (el CI es único)
        const userRes = await api.get('/me');
        const ci = userRes.data.ci;
        if (ci) {
          const postRes = await api.get(`/postulantes/buscar-ci?ci=${ci}`);
          if (postRes.data.encontrado && postRes.data.postulante) {
            // Cargar el detalle completo
            const detailRes = await api.get(`/postulantes/${postRes.data.postulante.id}`);
            setPostulanteInfo(detailRes.data);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  const adminCards = [
    { title: 'Usuarios', desc: 'Administrar accesos, roles y cuentas.', path: '/admin/usuarios' },
    { title: 'Postulantes', desc: 'Búsqueda avanzada y verificación de expedientes.', path: '/admin/postulantes' },
    { title: 'Planificación de Grupos', desc: 'Distribución y asignación automática por turnos.', path: '/admin/grupos' },
    { title: 'Gestión Docente', desc: 'Asignación de materias a paralelos y control de cátedras.', path: '/admin/docentes' },
    { title: 'Calificaciones', desc: 'Registrar notas individuales e importar CSV de laboratorios.', path: '/admin/notas' },
    { title: 'Admisiones & Cupos', desc: 'Establecer límites de vacantes y ejecutar algoritmo de ingreso.', path: '/admin/admisiones' },
    { title: 'Reportes & Voz', desc: 'Descarga de reportes estructurados, dinámicos y comandos de voz.', path: '/admin/reportes' },
  ];

  if (loading) {
    return <div className="py-12 text-center text-slate-400 text-sm">Cargando panel de control...</div>;
  }

  // VISTA PARA POSTULANTE
  if (user?.role === 'Postulante') {
    if (!postulanteInfo) {
      return (
        <div className="py-8 text-center text-slate-400 text-sm glass-panel p-6 rounded-2xl max-w-md mx-auto">
          No se encontró expediente asociado a tu cuenta de postulante. Contacta a soporte técnico.
        </div>
      );
    }

    const materias = ['Computacion', 'Matematicas', 'Fisica', 'Ingles'];
    const getNotaExamenPost = (mName, examNum) => {
      const ex = postulanteInfo.examenes?.find(
        (e) => e.materia?.nombre === mName && e.numero_examen === examNum
      );
      return ex ? ex.nota : '-';
    };

    const getPromedioMateriaPost = (mName) => {
      const nf = postulanteInfo.notas_finales?.find((n) => n.materia?.nombre === mName);
      return nf ? nf.promedio : '-';
    };

    return (
      <div className="py-6 max-w-5xl mx-auto px-4 space-y-8">
        {/* Encabezado */}
        <div>
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Portal del Postulante</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">Expediente de Admisión CUP</h1>
          <p className="text-xs text-slate-400 mt-1">Gestión Académica Activa: {postulanteInfo.gestion?.codigo}</p>
        </div>

        {/* Estado General de Admisión */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-xs text-slate-500 block mb-1">Nombre Completo</span>
            <span className="text-base font-bold text-slate-100">{postulanteInfo.nombres} {postulanteInfo.apellidos}</span>
            <div className="text-xs text-slate-400 mt-1">CI: {postulanteInfo.ci} | Código: {postulanteInfo.codigo_postulante}</div>
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-1">Grupo Asignado</span>
            <span className="text-sm font-semibold text-slate-200">
              {postulanteInfo.asignacion_grupo?.grupo 
                ? `Grupo ${postulanteInfo.asignacion_grupo.grupo.numero} (${postulanteInfo.asignacion_grupo.grupo.turno})` 
                : 'Sin grupo asignado.'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block mb-1">Estado de Aprobación</span>
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
              postulanteInfo.estado === 'Aprobado' 
                ? 'bg-emerald-500/10 text-emerald-400' 
                : postulanteInfo.estado === 'Reprobado'
                ? 'bg-red-500/10 text-red-400'
                : 'bg-blue-500/10 text-blue-400'
            }`}>
              {postulanteInfo.estado}
            </span>
          </div>
        </div>

        {/* Admisión Final Destacada */}
        {postulanteInfo.admision && (
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-emerald-500 bg-emerald-950/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-extrabold text-emerald-400 text-sm mb-1">¡ADMISIÓN CONFIRMADA!</h3>
              <p className="text-xs text-slate-300">Has sido admitido oficialmente en la FICCT para la carrera seleccionada.</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block tracking-widest uppercase">Carrera Asignada</span>
              <span className="text-lg font-extrabold text-slate-100">{postulanteInfo.admision.carrera?.nombre}</span>
              <div className="text-[10px] text-slate-400 mt-0.5">Ingreso por: {postulanteInfo.admision.via}</div>
            </div>
          </div>
        )}

        {/* Planilla de Notas del Estudiante */}
        <div className="glass-panel p-6 rounded-2xl">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">Calificaciones por Materia</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-widest text-[10px] font-bold">
                  <th className="py-3 px-2">Materia</th>
                  <th className="py-3 px-2 text-center">Parcial 1 (30%)</th>
                  <th className="py-3 px-2 text-center">Parcial 2 (30%)</th>
                  <th className="py-3 px-2 text-center">Examen Final (40%)</th>
                  <th className="py-3 px-2 text-center">Nota Final (Ponderado)</th>
                </tr>
              </thead>
              <tbody>
                {materias.map((mName) => {
                  const p1 = getNotaExamenPost(mName, 1);
                  const p2 = getNotaExamenPost(mName, 2);
                  const ef = getNotaExamenPost(mName, 3);
                  const pf = getPromedioMateriaPost(mName);

                  return (
                    <tr key={mName} className="border-b border-slate-800/40 hover:bg-slate-900/10 text-slate-300">
                      <td className="py-4 px-2 font-medium text-slate-200">{mName}</td>
                      <td className="py-4 px-2 text-center font-mono">{p1}</td>
                      <td className="py-4 px-2 text-center font-mono">{p2}</td>
                      <td className="py-4 px-2 text-center font-mono">{ef}</td>
                      <td className={`py-4 px-2 text-center font-bold font-mono ${
                        pf !== '-' && pf >= 60 ? 'text-emerald-400' : pf !== '-' ? 'text-red-400' : 'text-slate-500'
                      }`}>
                        {pf}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Acceso a Simulacros */}
        <div className="glass-panel p-6 rounded-2xl flex justify-between items-center bg-blue-950/10 border-blue-500/10">
          <div>
            <h3 className="font-semibold text-slate-200 text-sm">¿Deseas practicar antes de tus exámenes?</h3>
            <p className="text-xs text-slate-400 mt-1">Realiza simulacros de examen con 10 preguntas por materia del banco oficial de la facultad.</p>
          </div>
          <button 
            onClick={() => navigate('/simulacro')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold tracking-wide shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
          >
            Iniciar Simulacro (CU23)
          </button>
        </div>
      </div>
    );
  }

  // VISTA PARA ADMINISTRADOR / COORDINADOR (CU22)
  // CU22 - Paso 10: B_Dash --> Act : + RenderizarGraficosYTarjetasKPI()
  return (
    <div className="py-6 max-w-7xl mx-auto px-4 space-y-8">
      {/* Encabezado */}
      <div>
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Dashboard de Control</span>
        <h1 className="text-2xl font-bold text-slate-100 mt-1">Estadísticas en Tiempo Real (CU22)</h1>
        <p className="text-xs text-slate-400 mt-1">Sesión: {user?.name} ({user?.role})</p>
      </div>

      {stats && (
        <>
          {/* Tarjetas KPI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl">
              <span className="text-[10px] text-slate-400 tracking-wider uppercase block mb-1">Total Postulantes</span>
              <span className="text-2xl font-bold text-slate-100">{stats.total_inscritos}</span>
              <span className="text-[10px] text-slate-500 block mt-2">Registrados en la gestión</span>
            </div>
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-emerald-500">
              <span className="text-[10px] text-slate-400 tracking-wider uppercase block mb-1">Aprobados CUP</span>
              <span className="text-2xl font-bold text-emerald-400">{stats.aprobados}</span>
              <span className="text-[10px] text-slate-500 block mt-2">Porcentaje: {stats.porcentaje_aprobacion}%</span>
            </div>
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-red-500">
              <span className="text-[10px] text-slate-400 tracking-wider uppercase block mb-1">Reprobados CUP</span>
              <span className="text-2xl font-bold text-red-400">{stats.reprobados}</span>
              <span className="text-[10px] text-slate-500 block mt-2">Aún sin nota mínima aprobatoria</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Llenado de Cupos por Carrera (Barra de progreso visual) */}
            <div className="glass-panel p-6 rounded-2xl lg:col-span-1 space-y-6">
              <div>
                <h3 className="font-semibold text-slate-200 text-sm">Estado de Cupos por Carrera</h3>
                <p className="text-[10px] text-slate-500 mt-1">Avance de plazas cubiertas sobre el límite máximo.</p>
              </div>
              <div className="space-y-4">
                {stats.cupos?.map((c) => (
                  <div key={c.nombre} className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{c.nombre}</span>
                      <span className="text-slate-400 font-mono">{c.ocupados} / {c.cupo_maximo}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          c.porcentaje_llenado >= 100 ? 'bg-red-500' : c.porcentaje_llenado >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(c.porcentaje_llenado, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-[9px] text-slate-500 font-bold block text-right font-mono">
                      {c.porcentaje_llenado}% completado
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ocupación de Grupos y Aulas */}
            <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-4">
              <h3 className="font-semibold text-slate-200 text-sm">Ocupación Física de Grupos (Máx: 70)</h3>
              <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-widest text-[9px] font-bold">
                      <th className="py-2">Paralelo</th>
                      <th className="py-2">Turno</th>
                      <th className="py-2">Alumnos Asignados</th>
                      <th className="py-2">Avance de Carga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.grupos?.map((g) => (
                      <tr key={g.id} className="border-b border-slate-800/40 text-slate-300">
                        <td className="py-2.5 font-semibold">Grupo {g.numero}</td>
                        <td className="py-2.5">{g.turno}</td>
                        <td className="py-2.5 font-mono">{g.estudiantes} / 70</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${Math.min(g.porcentaje, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-[9px] font-mono text-slate-400">{g.porcentaje}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Ranking de Grupos por Tasa de Aprobación */}
            <div className="glass-panel p-6 rounded-2xl lg:col-span-1 space-y-4">
              <h3 className="font-semibold text-slate-200 text-sm">Tasa de Aprobación por Grupo</h3>
              <div className="space-y-3">
                {stats.ranking_grupos?.slice(0, 4).map((r, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-900/30 p-2.5 rounded-xl border border-slate-800/50">
                    <div>
                      <span className="text-xs font-bold text-slate-200">Grupo {r.numero}</span>
                      <span className="text-[10px] text-slate-500 block">Turno: {r.turno}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400 font-mono">{r.tasa_aprobacion}%</span>
                      <span className="text-[9px] text-slate-500 block">Aprobados: {r.aprobados} / {r.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Accesos rápidos de administración */}
            <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
              <h3 className="font-semibold text-slate-200 text-sm mb-4">Accesos de Configuración Rápida</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {adminCards.map((c, i) => (
                  <div 
                    key={i} 
                    onClick={() => navigate(c.path)}
                    className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 cursor-pointer hover:border-blue-500/35 hover:bg-slate-900/20 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="font-semibold text-xs text-slate-200 hover:text-blue-400">{c.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{c.desc.slice(0, 50)}...</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
