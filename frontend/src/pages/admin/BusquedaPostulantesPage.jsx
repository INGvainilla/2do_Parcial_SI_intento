import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function BusquedaPostulantesPage() {
  const [postulantes, setPostulantes] = useState([]);
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchPostulantes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/postulantes', {
        params: { search, estado }
      });
      setPostulantes(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostulantes();
  }, [estado]);

  return (
    <div className="py-6">
      <div className="mb-8">
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest font-mono">Control Escolar</span>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-1">Búsqueda de Postulantes</h1>
      </div>
      
      <div className="glass-panel p-5 rounded-2xl shadow-xl mb-6 flex flex-col md:flex-row gap-4 items-center">
        <input 
          type="text" 
          placeholder="Buscar por nombres, apellidos o cédula de identidad..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm" 
        />
        
        <select 
          value={estado} 
          onChange={(e) => setEstado(e.target.value)}
          className="bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-blue-500 transition-colors text-sm outline-none w-full md:w-auto"
        >
          <option value="">Todos los Estados</option>
          <option value="Preinscrito">Preinscritos</option>
          <option value="Verificado">Verificados</option>
          <option value="Inscrito">Inscritos</option>
          <option value="En Evaluacion">En Evaluación</option>
        </select>

        <button 
          onClick={fetchPostulantes}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer w-full md:w-auto"
        >
          Filtrar
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Cargando postulantes...</p>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full border-collapse">
            <thead className="bg-slate-900/90 text-slate-300 border-b border-slate-800">
              <tr>
                <th className="p-4 text-left text-xs font-bold uppercase tracking-wider">Postulante</th>
                <th className="p-4 text-left text-xs font-bold uppercase tracking-wider">CI</th>
                <th className="p-4 text-left text-xs font-bold uppercase tracking-wider">Correo Electrónico</th>
                <th className="p-4 text-left text-xs font-bold uppercase tracking-wider">Turno</th>
                <th className="p-4 text-left text-xs font-bold uppercase tracking-wider">Estado</th>
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
                    <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      {p.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
