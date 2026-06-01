import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users').then(({ data }) => setUsers(data.data || [])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="py-6">
      <div className="mb-8">
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest font-mono">Seguridad</span>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-1">Gestión de Usuarios</h1>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Cargando registros...</p>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full border-collapse">
            <thead className="bg-slate-900/90 text-slate-300 border-b border-slate-800">
              <tr>
                <th className="p-4 text-left text-xs font-bold uppercase tracking-wider">Nombre Completo</th>
                <th className="p-4 text-left text-xs font-bold uppercase tracking-wider">Correo Electrónico</th>
                <th className="p-4 text-left text-xs font-bold uppercase tracking-wider">Rol de Sistema</th>
                <th className="p-4 text-left text-xs font-bold uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/55">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/20 transition-colors">
                  <td className="p-4 text-sm font-medium text-slate-200">{u.name}</td>
                  <td className="p-4 text-sm text-slate-400">{u.email}</td>
                  <td className="p-4 text-sm text-slate-300 font-semibold">{u.role}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      u.active 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {u.active ? 'Activo' : 'Inactivo'}
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
