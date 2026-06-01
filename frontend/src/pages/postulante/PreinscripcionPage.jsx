import { useState } from 'react';
import api from '../../api/axios';

export default function PreinscripcionPage() {
  const [ci, setCi] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sexo, setSexo] = useState('M');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [colegio, setColegio] = useState('');
  const [primeraOpcion, setPrimeraOpcion] = useState('1');
  const [segundaOpcion, setSegundaOpcion] = useState('2');
  const [turno, setTurno] = useState('Manana');
  const [postulanteId, setPostulanteId] = useState(null);
  
  const [message, setMessage] = useState('');
  const [verificado, setVerificado] = useState(false);
  const [loading, setLoading] = useState(false);

  const enviarPreinscripcion = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.post('/postulantes', {
        ci,
        nombres,
        apellidos,
        fecha_nacimiento: fechaNacimiento,
        sexo,
        direccion,
        telefono,
        email,
        colegio_procedencia: colegio,
        primera_opcion_id: parseInt(primeraOpcion),
        segunda_opcion_id: parseInt(segundaOpcion),
        turno_preferencia: turno,
      });
      setMessage(data.message);
      setPostulanteId(data.postulante.id);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error en preinscripción');
    } finally {
      setLoading(false);
    }
  };

  const ejecutarVerificacion = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/postulantes/${postulanteId}/verificar`);
      setMessage('Verificación del SEGIP/SEDUCA completada: ' + data.message);
      setVerificado(data.estado_postulante === 'Verificado');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error en la verificación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="text-center mb-8">
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest font-mono">Registro</span>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-1">Formulario de Preinscripción</h1>
      </div>
      
      {message && (
        <div className="bg-blue-950/40 border border-blue-500/20 text-blue-300 p-4 rounded-xl mb-6 text-sm text-center">
          {message}
        </div>
      )}

      <div className="glass-panel p-8 rounded-2xl shadow-2xl">
        {!postulanteId ? (
          <form onSubmit={enviarPreinscripcion} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Carnet de Identidad (CI)</label>
              <input type="text" value={ci} onChange={(e) => setCi(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors" required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nombres</label>
              <input type="text" value={nombres} onChange={(e) => setNombres(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors" required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Apellidos</label>
              <input type="text" value={apellidos} onChange={(e) => setApellidos(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors" required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Fecha de Nacimiento</label>
              <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors" required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sexo</label>
              <select value={sexo} onChange={(e) => setSexo(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors" required>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Correo Electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors" required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Teléfono</label>
              <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Dirección de Domicilio</label>
              <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Primera Opción de Carrera</label>
              <select value={primeraOpcion} onChange={(e) => setPrimeraOpcion(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors">
                <option value="1">Ingenieria Informatica</option>
                <option value="2">Ingenieria de Sistemas</option>
                <option value="3">Ingenieria en Redes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Segunda Opción de Carrera</label>
              <select value={segundaOpcion} onChange={(e) => setSegundaOpcion(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors">
                <option value="1">Ingenieria Informatica</option>
                <option value="2">Ingenieria de Sistemas</option>
                <option value="3">Ingenieria en Redes</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Turno de Preferencia</label>
              <select value={turno} onChange={(e) => setTurno(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors">
                <option value="Manana">Mañana</option>
                <option value="Tarde">Tarde</option>
                <option value="Noche">Noche</option>
              </select>
            </div>

            <button type="submit" disabled={loading}
              className="md:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-500/10 cursor-pointer mt-4"
            >
              {loading ? 'Procesando registro...' : 'Registrar Preinscripción'}
            </button>
          </form>
        ) : (
          <div className="text-center py-6">
            <p className="text-slate-300 text-sm mb-8 leading-relaxed max-w-md mx-auto">
              Preinscripción registrada correctamente. Proceda a verificar su información en tiempo real contra los registros civiles del SEGIP y SEDUCA.
            </p>
            <button 
              onClick={ejecutarVerificacion}
              disabled={loading || verificado}
              className={`px-8 py-3.5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer ${
                verificado 
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {verificado ? 'Verificación Completada Exitosamente' : 'Iniciar Verificación SEGIP/SEDUCA'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
