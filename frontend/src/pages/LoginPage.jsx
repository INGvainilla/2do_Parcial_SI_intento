import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Credenciales invalidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-950/35 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md z-10">
        {/* Logo de la Facultad / Universidad Simulado */}
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-3xl px-5 py-2.5 rounded-2xl shadow-xl shadow-blue-500/10 mb-4 tracking-wider">
            FICCT
          </div>
          <h2 className="text-sm font-semibold tracking-widest text-blue-400 uppercase">U.A.G.R.M.</h2>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-2xl shadow-2xl shadow-black/40">
          <h1 className="text-xl font-semibold text-slate-100 mb-1">Admision CUP</h1>
          <p className="text-sm text-slate-400 mb-6">Autenticacion obligatoria de usuarios</p>

          {error && (
            <div className="bg-red-950/50 border border-red-500/30 text-red-300 p-3 rounded-lg mb-5 text-sm text-center">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Correo Electronico</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@ficct.uagrm.edu.bo"
              className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" 
              required 
            />
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Contrasena</label>
              <a href="#" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">¿Recuperar?</a>
            </div>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" 
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 btn-premium shadow-lg shadow-blue-600/15 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Validando credenciales...' : 'Ingresar al sistema'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          © {new Date().getFullYear()} Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones
        </p>
      </div>
    </div>
  );
}
