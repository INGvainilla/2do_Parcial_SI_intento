import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const adminLinks = [
    { to: '/admin/usuarios', label: 'Usuarios' },
    { to: '/admin/postulantes', label: 'Postulantes' },
    { to: '/admin/grupos', label: 'Grupos' },
    { to: '/admin/docentes', label: 'Docentes' },
  ];

  const postulanteLinks = [
    { to: '/preinscripcion', label: 'Preinscripción' },
    { to: '/inscripcion', label: 'Matrícula y Pago' },
    { to: '/simulacro', label: 'Simulacro Examen' },
  ];

  const links = ['Administrador', 'Coordinador'].includes(user?.role)
    ? adminLinks
    : user?.role === 'Postulante'
    ? postulanteLinks
    : [];

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800 px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="bg-blue-600 text-white font-extrabold px-3 py-1 rounded-lg text-sm tracking-wide">
          FICCT
        </span>
        <Link to="/dashboard" className="font-semibold text-slate-100 hover:text-white transition-colors tracking-tight text-base">
          CUP Portal
        </Link>
      </div>

      <div className="flex gap-1 items-center">
        {links.map((l) => {
          const isActive = location.pathname === l.to;
          return (
            <Link 
              key={l.to} 
              to={l.to} 
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600/15 text-blue-400 border-b-2 border-blue-500' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex flex-col items-end">
          <span className="text-xs font-medium text-slate-200">{user?.name}</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{user?.role}</span>
        </div>
        
        <div className="h-6 w-px bg-slate-800"></div>

        <button 
          onClick={logout} 
          className="text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer"
        >
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
}
