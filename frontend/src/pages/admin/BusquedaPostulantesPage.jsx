import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function BusquedaPostulantesPage() {
  const [postulantes, setPostulantes] = useState([]);
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [carreraId, setCarreraId] = useState('');
  const [turno, setTurno] = useState('');
  const [recurrente, setRecurrente] = useState('');
  
  const [loading, setLoading] = useState(false);
  
  // Paginación
  const [page, setPage] = useState(1);
  const [paginationData, setPaginationData] = useState({
    current_page: 1,
    last_page: 1,
    total: 0
  });

  const fetchPostulantes = async (pageNum = 1) => {
    // CU09 - Paso 1: Act -> B_Int : + IngresarFiltros(criterio)
    setLoading(true);
    try {
      // CU09 - Paso 2: B_Int -> C_Ctrl : + index(request)
      const params = { page: pageNum };
      if (search) params.search = search;
      if (estado) params.estado = estado;
      if (carreraId) params.carrera_id = carreraId;
      if (turno) params.turno = turno;
      if (recurrente !== '') params.recurrente = recurrente;

      const { data } = await api.get('/postulantes', { params });

      // CU09 - Paso 6: B_Int --> Act : + RenderizarGrillaResultados()
      setPostulantes(data.data || []);
      setPaginationData({
        current_page: data.current_page || 1,
        last_page: data.last_page || 1,
        total: data.total || 0
      });
      setPage(data.current_page || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostulantes(1); // Reiniciar a página 1 cuando cambian filtros de dropdowns principales (o inicial)
  }, [estado, carreraId, turno, recurrente]);

  const handleFilterClick = () => {
    fetchPostulantes(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= paginationData.last_page) {
      fetchPostulantes(newPage);
    }
  };

  const exportToCSV = () => {
    if (postulantes.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }
    
    // Header
    const headers = ["CI", "Apellidos", "Nombres", "Correo Electrónico", "Turno", "Estado", "Recurrente"];
    
    // Rows
    const rows = postulantes.map(p => [
      p.ci,
      `"${p.apellidos}"`,
      `"${p.nombres}"`,
      p.email,
      p.turno_preferencia,
      p.estado,
      p.recurrente ? "Si" : "No"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `postulantes_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest font-mono">Control Escolar</span>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-1">Búsqueda de Postulantes</h1>
        </div>
        <button 
          onClick={exportToCSV}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Exportar CSV
        </button>
      </div>
      
      {/* CU09 - Filtros Avanzados */}
      <div className="glass-panel p-5 rounded-2xl shadow-xl mb-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <input 
            type="text" 
            placeholder="Buscar por nombres, apellidos, CI o email..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFilterClick()}
            className="flex-1 bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm w-full" 
          />
          <button 
            onClick={handleFilterClick}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer w-full md:w-auto shrink-0"
          >
            Buscar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select 
            value={estado} 
            onChange={(e) => setEstado(e.target.value)}
            className="bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-blue-500 transition-colors text-sm outline-none w-full"
          >
            <option value="">Todos los Estados</option>
            <option value="Preinscrito">Preinscritos</option>
            <option value="Verificado">Verificados</option>
            <option value="Inscrito">Inscritos</option>
            <option value="En Evaluacion">En Evaluación</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Reprobado">Reprobado</option>
          </select>

          <select 
            value={carreraId} 
            onChange={(e) => setCarreraId(e.target.value)}
            className="bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-blue-500 transition-colors text-sm outline-none w-full"
          >
            <option value="">Todas las Carreras</option>
            <option value="1">Ingeniería Informática</option>
            <option value="2">Ingeniería de Sistemas</option>
            <option value="3">Ingeniería en Redes</option>
          </select>

          <select 
            value={turno} 
            onChange={(e) => setTurno(e.target.value)}
            className="bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-blue-500 transition-colors text-sm outline-none w-full"
          >
            <option value="">Todos los Turnos</option>
            <option value="Manana">Mañana</option>
            <option value="Tarde">Tarde</option>
            <option value="Noche">Noche</option>
          </select>

          <select 
            value={recurrente} 
            onChange={(e) => setRecurrente(e.target.value)}
            className="bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-blue-500 transition-colors text-sm outline-none w-full"
          >
            <option value="">Todos (Nuevos/Recurrentes)</option>
            <option value="1">Solo Recurrentes</option>
            <option value="0">Solo Nuevos</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-4"></div>
          <p className="text-slate-400 text-sm">Cargando postulantes...</p>
        </div>
      ) : postulantes.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-200 mb-2">No hay resultados</h3>
          <p className="text-sm text-slate-400 max-w-sm">
            No se encontraron postulantes que coincidan con los criterios de búsqueda especificados. Prueba cambiando los filtros.
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-slate-900/90 text-slate-300 border-b border-slate-800">
                <tr>
                  <th className="p-4 text-left text-xs font-bold uppercase tracking-wider">Postulante</th>
                  <th className="p-4 text-left text-xs font-bold uppercase tracking-wider">CI</th>
                  <th className="p-4 text-left text-xs font-bold uppercase tracking-wider">Correo Electrónico</th>
                  <th className="p-4 text-left text-xs font-bold uppercase tracking-wider">Turno</th>
                  <th className="p-4 text-left text-xs font-bold uppercase tracking-wider">Estado</th>
                  <th className="p-4 text-left text-xs font-bold uppercase tracking-wider">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/55">
                {postulantes.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-4 text-sm font-medium text-slate-200">{p.apellidos}, {p.nombres}</td>
                    <td className="p-4 text-sm text-slate-400 font-mono">{p.ci}</td>
                    <td className="p-4 text-sm text-slate-400">{p.email}</td>
                    <td className="p-4 text-sm text-slate-300">{p.turno_preferencia}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                        p.estado === 'Aprobado' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        p.estado === 'Reprobado' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                        'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      }`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="p-4">
                      {p.recurrente ? (
                        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider">
                          Recurrente
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          Nuevo
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Controles de Paginación */}
          <div className="bg-slate-900/60 border-t border-slate-800 p-4 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Mostrando {postulantes.length} postulantes (Total: {paginationData.total})
            </span>
            
            <div className="flex gap-2">
              <button 
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <div className="flex items-center px-3 text-xs font-medium text-slate-300">
                Página {page} de {paginationData.last_page}
              </div>
              <button 
                onClick={() => handlePageChange(page + 1)}
                disabled={page === paginationData.last_page}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
