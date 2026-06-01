import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const adminCards = [
    { title: 'Usuarios', desc: 'Administrar accesos, roles y cuentas.', path: '/admin/usuarios' },
    { title: 'Postulantes', desc: 'Búsqueda avanzada y verificación de expedientes.', path: '/admin/postulantes' },
    { title: 'Planificación de Grupos', desc: 'Distribución y asignación automática por turnos.', path: '/admin/grupos' },
    { title: 'Gestión Docente', desc: 'Asignación de materias a paralelos y control de carga.', path: '/admin/docentes' },
  ];

  const postulanteCards = [
    { title: 'Preinscripción', desc: 'Formulario de datos personales y validación SEGIP/SEDUCA.', path: '/preinscripcion' },
    { title: 'Matrícula y Pago', desc: 'Validar documentos y pago de arancel mediante Stripe.', path: '/inscripcion' },
    { title: 'Simulacro de Examen', desc: 'Evaluación de prueba de 40 preguntas (computación, física, matemáticas, lenguaje).', path: '/simulacro' },
  ];

  const cards = ['Administrador', 'Coordinador'].includes(user?.role)
    ? adminCards
    : user?.role === 'Postulante'
    ? postulanteCards
    : [];

  return (
    <div className="py-6">
      <div className="mb-10">
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Panel Principal</span>
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight mt-1">Control del Sistema CUP</h1>
        <p className="text-sm text-slate-400 mt-2">
          Sesión iniciada como: <span className="text-slate-300 font-semibold">{user?.name}</span> ({user?.role})
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((c, i) => (
          <div 
            key={i} 
            onClick={() => navigate(c.path)}
            className="glass-panel p-6 rounded-2xl cursor-pointer hover:border-slate-600 hover:bg-slate-900/40 transition-all duration-300 group flex flex-col justify-between"
          >
            <div>
              <div className="h-2 w-12 bg-blue-500 rounded mb-4 transition-all duration-300 group-hover:w-20"></div>
              <h3 className="font-semibold text-lg text-slate-100 group-hover:text-blue-400 transition-colors">{c.title}</h3>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">{c.desc}</p>
            </div>
            
            <div className="mt-6 flex justify-end">
              <span className="text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
                Acceder →
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
