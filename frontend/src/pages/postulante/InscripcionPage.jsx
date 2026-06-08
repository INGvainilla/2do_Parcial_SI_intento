import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

export default function InscripcionPage() {
  const [searchParams] = useSearchParams();
  const queryCi = searchParams.get('ci') || '';
  const sessionId = searchParams.get('session_id') || '';

  const [ci, setCi] = useState(queryCi);
  const [postulante, setPostulante] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pagoVerificado, setPagoVerificado] = useState(false);

  const getContrasenaGenerada = (post) => {
    if (!post) return '';
    const nombresTrim = (post.nombres || '').trim();
    const primerNombre = nombresTrim.split(' ')[0] || '';
    const letraNombre = primerNombre.charAt(0).toUpperCase();

    const apellidosTrim = (post.apellidos || '').trim();
    const primerApellido = apellidosTrim.split(' ')[0] || '';
    const letraApellido = primerApellido.charAt(0).toLowerCase();

    return `${(post.ci || '').trim()}${letraNombre}${letraApellido}`;
  };

  useEffect(() => {
    if (queryCi) {
      autoBuscar(queryCi);
    } else if (sessionId) {
      verificarPagoSession(sessionId);
    }
  }, [queryCi, sessionId]);

  const autoBuscar = async (ciValue) => {
    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.get('/postulantes/buscar-ci', { params: { ci: ciValue } });
      if (data.encontrado && data.postulante) {
        setPostulante(data.postulante);
      } else {
        setMessage('No se encontró ningún postulante registrado con el documento ingresado.');
      }
    } catch (err) {
      setMessage('Error al realizar la consulta.');
    } finally {
      setLoading(false);
    }
  };

  const verificarPagoSession = async (sid) => {
    // CU07 - Paso 13: B_Stripe -> B_Insc : + retornarExito()
    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.post('/pagos/verificar', { session_id: sid });
      if (data.pagado) {
        // CU07 - Paso 14: B_Insc --> Act : + mostrarMensajeConfirmacion()
        setPagoVerificado(true);
        setPostulante(data.postulante);
      } else {
        setMessage(data.message || 'El pago no ha sido verificado aún.');
      }
    } catch (err) {
      setMessage('Error al verificar el pago.');
    } finally {
      setLoading(false);
    }
  };

  const buscarPostulante = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.get('/postulantes/buscar-ci', { params: { ci } });
      if (data.encontrado && data.postulante) {
        setPostulante(data.postulante);
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
    // CU07 - Paso 1: Act -> B_Insc : + Solicitar pago de matrícula()
    setLoading(true);
    try {
      // CU07 - Paso 2: B_Insc -> C_Insc : + crearSesion(postulante)
      const { data } = await api.post(`/postulantes/${postulante.id}/pago`);
      
      // CU07 - Paso 5: C_Insc --> B_Insc : + RedirigirAPasarela()
      // CU07 - Paso 6: B_Insc --> Act : + MostrarFormularioPagoStripe()
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
    <div className="min-h-screen bg-slate-950 px-4 relative overflow-hidden py-12 flex flex-col items-center justify-center">
      {/* Decorative background bubbles */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-950/25 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      <div className="w-full max-w-2xl z-10">
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
          {pagoVerificado ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 mb-6 border border-emerald-500/20">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-slate-100 mb-2">¡Pago de Matrícula Exitoso!</h2>
              
              <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl mb-6 text-center text-sm font-semibold max-w-md mx-auto">
                Su cuenta ha sido enviada a su correo
              </div>

              <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                Tu pago ha sido procesado correctamente y tu inscripción a la gestión académica del CUP ha sido confirmada.
              </p>

              <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl mb-8 text-left space-y-4 max-w-md mx-auto">
                <div className="text-xs font-semibold text-blue-400 uppercase tracking-widest font-mono border-b border-slate-800/80 pb-2">
                  Credenciales de Acceso al Sistema
                </div>
                <div className="space-y-2.5">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Usuario / Correo</span>
                    <span className="text-sm font-semibold text-slate-200 select-all">{postulante?.email}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contraseña de acceso</span>
                    <span className="text-sm font-mono font-semibold text-slate-200 select-all">{getContrasenaGenerada(postulante)}</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 leading-relaxed pt-2 border-t border-slate-800/80">
                  * Utiliza estas credenciales en la pantalla de inicio de sesión para ingresar al portal del CUP y rendir tus exámenes de simulacro.
                </div>
              </div>

              <Link
                to="/login"
                className="inline-block w-full max-w-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-500/10 cursor-pointer"
              >
                Ir a Iniciar Sesión
              </Link>
            </div>
          ) : !postulante ? (
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
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              <div className="text-center mt-8 border-t border-slate-800/60 pt-4">
                <Link to="/login" className="text-xs text-slate-400 hover:text-slate-200 transition-colors font-semibold">
                  Volver al Login
                </Link>
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
                  <span className="text-sm font-bold text-slate-100">700.00 BOB</span>
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
                <div className="space-y-4">
                  <div className="bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl font-semibold text-center text-sm">
                    La matrícula académica ha sido cancelada y registrada exitosamente.
                  </div>
                  
                  <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl text-left space-y-4">
                    <div className="text-xs font-semibold text-blue-400 uppercase tracking-widest font-mono border-b border-slate-800/80 pb-2">
                      Credenciales de Acceso Generadas
                    </div>
                    <div className="space-y-2.5">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Usuario / Correo</span>
                        <span className="text-sm font-semibold text-slate-200 select-all">{postulante?.email}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contraseña de acceso</span>
                        <span className="text-sm font-mono font-semibold text-slate-200 select-all">{getContrasenaGenerada(postulante)}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to="/login"
                    className="block text-center w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-500/10 cursor-pointer text-sm"
                  >
                    Ir a Iniciar Sesión
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-rose-950/20 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-center text-xs leading-relaxed">
                    El perfil no cumple con la verificación requerida (SEGIP/SEDUCA). Complete el paso de verificación antes de proceder al pago.
                  </div>
                  
                  <Link
                    to={`/preinscripcion`}
                    className="block text-center w-full bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 py-3.5 rounded-xl font-semibold transition-all duration-300 cursor-pointer text-xs uppercase tracking-wider"
                  >
                    Ir a Preinscripción / Verificación
                  </Link>
                </div>
              )}

              <div className="text-center mt-8 border-t border-slate-800/60 pt-4">
                <button 
                  onClick={() => setPostulante(null)}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors font-semibold mr-4 cursor-pointer"
                >
                  Buscar otro CI
                </button>
                <Link to="/login" className="text-xs text-slate-400 hover:text-slate-200 transition-colors font-semibold">
                  Volver al Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
