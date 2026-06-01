import { useState } from 'react';
import api from '../../api/axios';

export default function InscripcionPage() {
  const [ci, setCi] = useState('');
  const [postulante, setPostulante] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const buscarPostulante = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.get('/postulantes', { params: { ci } });
      if (data.data && data.data.length > 0) {
        setPostulante(data.data[0]);
      } else {
        setMessage('No se encontró ningún postulante registrado con el documento ingresado.');
      }
    } catch (err) {
      setMessage('Error al realizar la consulta.');
    } finally {
      setLoading(false);
    }
  };

  const iniciarPago = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/postulantes/${postulante.id}/pago`);
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error al conectar con la pasarela de pagos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="text-center mb-8">
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest font-mono">Finanzas</span>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-1">Pago de Matrícula CUP</h1>
      </div>

      {message && (
        <div className="bg-blue-950/40 border border-blue-500/20 text-blue-300 p-4 rounded-xl mb-6 text-sm text-center">
          {message}
        </div>
      )}

      <div className="glass-panel p-8 rounded-2xl shadow-2xl">
        {!postulante ? (
          <form onSubmit={buscarPostulante}>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Número de Carnet de Identidad (CI)
            </label>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={ci} 
                onChange={(e) => setCi(e.target.value)}
                placeholder="Ej. 8765432"
                className="flex-1 bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors" 
                required 
              />
              <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer"
              >
                Buscar
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-xl mb-6 space-y-4">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase">Postulante</span>
                <span className="text-sm font-semibold text-slate-200">{postulante.nombres} {postulante.apellidos}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase">Documento</span>
                <span className="text-sm font-semibold text-slate-200">{postulante.ci}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase">Estado Actual</span>
                <span className="text-sm font-semibold text-blue-400">{postulante.estado}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-xs font-semibold text-slate-400 uppercase">Arancel de Matrícula</span>
                <span className="text-sm font-bold text-slate-100">350.00 BOB</span>
              </div>
            </div>
            
            {postulante.estado === 'Verificado' ? (
              <button 
                onClick={iniciarPago}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-3.5 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-emerald-500/10 cursor-pointer text-sm"
              >
                {loading ? 'Redirigiendo a pasarela segura...' : 'Proceder al Pago Seguro con Tarjeta'}
              </button>
            ) : postulante.estado === 'Inscrito' || postulante.estado === 'En Evaluacion' ? (
              <div className="bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl font-semibold text-center text-sm">
                La matrícula académica ha sido cancelada y registrada exitosamente.
              </div>
            ) : (
              <div className="bg-rose-950/20 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-center text-xs leading-relaxed">
                El perfil no cumple con la verificación requerida (SEGIP/SEDUCA). Complete el paso de verificación antes de proceder al pago.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
