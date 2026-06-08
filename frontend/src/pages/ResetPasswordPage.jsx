import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

/**
 * CU03 - Restablecer Contraseña (Paso 7-10 del flujo principal)
 * 
 * El usuario llega aquí desde el enlace enviado por correo.
 * La URL contiene token y email como query params.
 * Formulario para ingresar la nueva contraseña.
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token] = useState(searchParams.get('token') || '');
  const [email] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validar que tenemos token y email al cargar
  useEffect(() => {
    if (!token || !email) {
      setError('Enlace de recuperación inválido. Solicite uno nuevo.');
    }
  }, [token, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validación local: CU03 flujo principal paso 8
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== passwordConfirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      // CU03 - Paso 9: Enviar token + nueva contraseña al backend
      const response = await api.post('/reset-password', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      // CU03 - Paso 10: Confirmación exitosa
      setMessage(response.data.message || 'Contraseña actualizada exitosamente.');
      setSuccess(true);

      // Redirigir al login después de 3 segundos
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      // CU03 - Excepción E2: Token expirado o inválido
      const serverMessage = err.response?.data?.message;
      setError(serverMessage || 'Error al restablecer la contraseña. El enlace puede haber expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-950/35 rounded-full blur-[120px]"></div>
      <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-emerald-900/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-3xl px-5 py-2.5 rounded-2xl shadow-xl shadow-blue-500/10 mb-4 tracking-wider animate-pulse">
            FICCT
          </div>
          <h2 className="text-sm font-semibold tracking-widest text-blue-400 uppercase">U.A.G.R.M.</h2>
        </div>

        {/* CU03 - IU_Recuperacion (Formulario de nueva contraseña) */}
        <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-2xl shadow-2xl shadow-black/40 border border-slate-700/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-100">Nueva Contraseña</h1>
              <p className="text-xs text-slate-400">Establece tu nueva contraseña de acceso</p>
            </div>
          </div>

          {email && (
            <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg px-4 py-2.5 mb-6 mt-4">
              <p className="text-xs text-slate-400">Restableciendo para:</p>
              <p className="text-sm text-blue-400 font-medium">{email}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-950/50 border border-red-500/30 text-red-300 p-3 rounded-lg mb-5 text-sm text-center flex items-center gap-2 justify-center">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {message && (
            <div className="bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 p-3 rounded-lg mb-5 text-sm text-center flex items-center gap-2 justify-center">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {message}
            </div>
          )}

          {!success && token && email && (
            <>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  required
                  minLength={8}
                  autoFocus
                />
                {password.length > 0 && password.length < 8 && (
                  <p className="text-xs text-amber-400 mt-1.5 ml-1">Faltan {8 - password.length} caracteres</p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Confirmar Contraseña
                </label>
                <input
                  type="password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="Repita la contraseña"
                  className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  required
                  minLength={8}
                />
                {passwordConfirmation.length > 0 && password !== passwordConfirmation && (
                  <p className="text-xs text-red-400 mt-1.5 ml-1">Las contraseñas no coinciden</p>
                )}
                {passwordConfirmation.length >= 8 && password === passwordConfirmation && (
                  <p className="text-xs text-emerald-400 mt-1.5 ml-1">✓ Las contraseñas coinciden</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || password.length < 8 || password !== passwordConfirmation}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 btn-premium shadow-lg shadow-emerald-600/15 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mb-4"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Actualizando...
                  </span>
                ) : 'Restablecer Contraseña'}
              </button>
            </>
          )}

          {success && (
            <div className="text-center py-2">
              <p className="text-sm text-slate-300 mb-1">Serás redirigido al login en 3 segundos...</p>
              <Link to="/login" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                Ir al login ahora →
              </Link>
            </div>
          )}

          {!success && (
            <div className="text-center space-y-2">
              <Link to="/forgot-password" className="block text-xs text-blue-400 hover:text-blue-300 transition-colors">
                Solicitar un nuevo enlace
              </Link>
              <Link to="/login" className="block text-xs text-slate-500 hover:text-slate-400 transition-colors">
                Volver al inicio de sesión
              </Link>
            </div>
          )}
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          © {new Date().getFullYear()} Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones
        </p>
      </div>
    </div>
  );
}
