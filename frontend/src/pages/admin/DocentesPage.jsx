import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function DocentesPage() {
  const [docentes, setDocentes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [materias, setMaterias] = useState([
    { id: 1, nombre: 'Matematicas' },
    { id: 2, nombre: 'Fisica' },
    { id: 3, nombre: 'Quimica' },
    { id: 4, nombre: 'Lenguaje' },
  ]);
  
  const [docenteId, setDocenteId] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [materiaId, setMateriaId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resDoc, resGrup] = await Promise.all([
        api.get('/docentes'),
        api.get('/grupos'),
      ]);
      setDocentes(resDoc.data || []);
      setGrupos(resGrup.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const asignarDocente = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await api.post('/docentes/asignar', {
        docente_id: parseInt(docenteId),
        grupo_id: parseInt(grupoId),
        materia_id: parseInt(materiaId),
      });
      setMessage('Asignación exitosa.');
      fetchData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error en la asignación');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="py-6">
      <div className="mb-8">
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest font-mono">Personal</span>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-1">Planificación Docente</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl shadow-xl h-fit">
          <h2 className="text-lg font-bold mb-4 text-slate-100">Crear Asignación</h2>
          {message && (
            <div className="bg-blue-950/40 border border-blue-500/20 text-blue-300 p-3 rounded-lg mb-4 text-xs text-center">
              {message}
            </div>
          )}
          <form onSubmit={asignarDocente} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Docente</label>
              <select value={docenteId} onChange={(e) => setDocenteId(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-200 outline-none focus:border-blue-500 transition-colors text-sm" required>
                <option value="">Seleccione Docente</option>
                {docentes.map(d => (
                  <option key={d.id} value={d.id}>{d.apellidos}, {d.nombres} ({d.especialidad})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Grupo</label>
              <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-200 outline-none focus:border-blue-500 transition-colors text-sm" required>
                <option value="">Seleccione Grupo</option>
                {grupos.map(g => (
                  <option key={g.id} value={g.id}>Grupo #{g.numero} — Turno {g.turno}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Materia</label>
              <select value={materiaId} onChange={(e) => setMateriaId(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-200 outline-none focus:border-blue-500 transition-colors text-sm" required>
                <option value="">Seleccione Materia</option>
                {materias.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer mt-2">
              Asignar Docente
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl shadow-xl">
          <h2 className="text-lg font-bold mb-4 text-slate-100">Docentes y Carga Horaria</h2>
          {loading ? (
            <p className="text-slate-400 text-sm">Cargando nómina...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-slate-900/90 text-slate-300 border-b border-slate-800">
                  <tr>
                    <th className="p-4 text-left text-xs font-bold uppercase tracking-wider">Docente</th>
                    <th className="p-4 text-left text-xs font-bold uppercase tracking-wider">Especialidad</th>
                    <th className="p-4 text-left text-xs font-bold uppercase tracking-wider">Carga Actual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/55">
                  {docentes.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="p-4 text-sm font-medium text-slate-200">{d.apellidos}, {d.nombres}</td>
                      <td className="p-4 text-sm text-slate-400">{d.especialidad}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          d.carga_actual >= 4 
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                            : 'bg-green-500/10 text-green-400 border border-green-500/20'
                        }`}>
                          {d.carga_actual} / 4 grupos
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
