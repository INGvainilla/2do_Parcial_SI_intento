import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function GruposPage() {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchGrupos = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/grupos');
      setGrupos(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const ejecutarAsignacion = async () => {
    setMessage('');
    try {
      const { data } = await api.post('/grupos/asignacion-masiva');
      setMessage(data.message + ` (${data.grupos_creados} grupos creados, ${data.postulantes_assigned ?? data.postulantes_asignados} asignados)`);
      fetchGrupos();
    } catch (e) {
      setMessage(e.response?.data?.message || 'Error en la asignacion masiva');
    }
  };

  useEffect(() => {
    fetchGrupos();
  }, []);

  return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest font-mono">Planificación</span>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-1">Organización de Paralelos</h1>
        </div>
        
        <button 
          onClick={ejecutarAsignacion}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer shadow-lg shadow-emerald-600/10"
        >
          Ejecutar Asignación Masiva
        </button>
      </div>

      {message && (
        <div className="bg-blue-950/40 border border-blue-500/20 text-blue-300 p-4 rounded-xl mb-8 text-sm text-center">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm">Cargando planificación de paralelos...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grupos.map((g) => {
            const percentage = Math.min((g.total_estudiantes / 70) * 100, 100);
            return (
              <div key={g.id} className="glass-panel p-6 rounded-2xl shadow-xl hover:border-slate-700 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-base text-slate-100">Grupo #{g.numero}</h3>
                  <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                    {g.turno}
                  </span>
                </div>
                
                <p className="text-xs text-slate-400">Aula: {g.aula?.nombre || 'S/A'} — {g.aula?.ubicacion || ''}</p>
                
                <div className="mt-6">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-slate-400">Capacidad Ocupada:</span>
                    <span className="font-bold text-slate-200">{g.total_estudiantes} / 70 estudiantes</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
