import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function PreinscripcionPage() {
  const navigate = useNavigate();

  // Estados del Formulario
  const [ci, setCi] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sexo, setSexo] = useState('M');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [colegio, setColegio] = useState('');
  const [ciudad, setCiudad] = useState('Santa Cruz de la Sierra');
  const [tituloBachiller, setTituloBachiller] = useState('');
  const [primeraOpcion, setPrimeraOpcion] = useState('1');
  const [segundaOpcion, setSegundaOpcion] = useState('2');
  const [turno, setTurno] = useState('Manana');

  // Estados del Flujo
  // Pasos: 'form' -> 'verification' -> 'validating' -> 'payment' -> 'processing_payment'
  const [step, setStep] = useState('form');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [postulanteData, setPostulanteData] = useState(null);
  const [paymentError, setPaymentError] = useState('');

  // CU08: Estado de detección de recurrente
  const [esRecurrente, setEsRecurrente] = useState(false);
  const [recurrenteMsg, setRecurrenteMsg] = useState('');
  const [buscandoCi, setBuscandoCi] = useState(false);

  // CU06: Estado de verificación SEGIP/SEDUCA
  const [verificacionStep, setVerificacionStep] = useState(''); // 'segip' | 'seduca' | 'done' | 'error'
  const [verificacionMsg, setVerificacionMsg] = useState('');

  const getCarreraName = (id) => {
    const mapping = {
      '1': 'Ingeniería Informática',
      '2': 'Ingeniería de Sistemas',
      '3': 'Ingeniería en Redes'
    };
    return mapping[id] || id;
  };

  const getTurnoName = (value) => {
    const mapping = {
      'Manana': 'Mañana',
      'Tarde': 'Tarde',
      'Noche': 'Noche'
    };
    return mapping[value] || value;
  };

  const getSexoName = (value) => {
    return value === 'M' ? 'Masculino' : 'Femenino';
  };

  // CU08: Buscar CI proactivamente al salir del campo
  const buscarCiRecurrente = useCallback(async (ciValue) => {
    if (!ciValue || ciValue.length < 7) {
      setEsRecurrente(false);
      setRecurrenteMsg('');
      return;
    }

    setBuscandoCi(true);
    try {
      // CU08 - Paso 2: B_Int -> C_Ctrl : + buscarPorCi(request)
      const { data } = await api.get('/postulantes/buscar-ci', { params: { ci: ciValue } });

      if (data.encontrado && data.postulante) {
        // CU08 - Paso 5: C_Ctrl --> B_Int : + RetornarEstadoDuplicado(true)
        // CU08 - Paso 6: B_Int --> Act : + MostrarAlertaRecurrente()
        setEsRecurrente(true);
        setRecurrenteMsg(data.message);

        // Precargar datos del postulante anterior en el formulario
        const p = data.postulante;
        setNombres(p.nombres || '');
        setApellidos(p.apellidos || '');
        setFechaNacimiento(p.fecha_nacimiento ? p.fecha_nacimiento.split('T')[0] : '');
        setSexo(p.sexo || 'M');
        setDireccion(p.direccion || '');
        setTelefono(p.telefono || '');
        setEmail(p.email || '');
        setColegio(p.colegio_procedencia || '');
        setCiudad(p.ciudad || 'Santa Cruz de la Sierra');
        setTituloBachiller(p.titulo_bachiller || '');
        if (p.primera_opcion_id) setPrimeraOpcion(String(p.primera_opcion_id));
        if (p.segunda_opcion_id) setSegundaOpcion(String(p.segunda_opcion_id));
        if (p.turno_preferencia) setTurno(p.turno_preferencia);
      } else {
        setEsRecurrente(false);
        setRecurrenteMsg('');
      }
    } catch (err) {
      console.error('Error al buscar CI:', err);
      setEsRecurrente(false);
      setRecurrenteMsg('');
    } finally {
      setBuscandoCi(false);
    }
  }, []);

  // PASO 1: Validar formulario y pasar a revisión
  const handleFormSubmit = (e) => {
    e.preventDefault();
    // CU05 - Paso 1: Act -> B_Int : + CompletarFormulario(datos)
    // CU05 - Paso 2: Act -> B_Int : + ClicIniciarRegistro()
    if (primeraOpcion === segundaOpcion) {
      setError('La primera y segunda opción de carrera deben ser diferentes.');
      return;
    }
    setError('');
    // CU05 - Paso 3: B_Int --> Act : + MostrarVerificacionDatos(resumen)
    setStep('verification');
  };

  // PASO 2: Proceder con verificación civil, registro y redirección a pago
  const handleVerifyAndRegister = async () => {
    // CU05 - Paso 4b: Act -> B_Int : + ClicSiguiente()
    // CU06 - Paso 1: Mostrar pantalla de carga
    setStep('validating');
    setLoading(true);
    setError('');
    setVerificacionStep('registrando');
    setVerificacionMsg('Registrando datos del postulante...');

    try {
      // CU05 - Paso 6b: B_Int -> C_Ctrl : + store(request)
      // 1. Registrar postulante en BD
      const { data: regData } = await api.post('/postulantes', {
        ci,
        nombres,
        apellidos,
        fecha_nacimiento: fechaNacimiento,
        sexo,
        direccion,
        telefono,
        email,
        colegio_procedencia: colegio,
        ciudad,
        titulo_bachiller: tituloBachiller,
        primera_opcion_id: parseInt(primeraOpcion),
        segunda_opcion_id: parseInt(segundaOpcion),
        turno_preferencia: turno,
      });

      const postulanteId = regData.postulante.id;

      // CU06 - Paso 2-5: Verificación SEGIP/SEDUCA (pantalla de carga animada)
      setVerificacionStep('segip');
      setVerificacionMsg('Consultando identidad con SEGIP...');

      // 2. Verificación civil (SEGIP/SEDUCA) - tarda ~1.4s por el mock delay
      const { data: verifData } = await api.post(
        `/postulantes/${postulanteId}/verificar`
      );

      if (verifData.verificacion && !verifData.verificacion.aprobado) {
        setVerificacionStep('error');
        setVerificacionMsg(verifData.message || 'No se pudo verificar la identidad o el título de bachiller.');
        throw new Error(verifData.message);
      }

      // CU06 - Éxito: ambas verificaciones pasaron
      setVerificacionStep('done');
      setVerificacionMsg('¡Verificación completa! Redirigiendo a pago...');

      // 3. Guardamos datos del postulante y redirigimos a Stripe
      setPostulanteData({ id: postulanteId, ...regData.postulante });

      // Pequeño delay para que el usuario vea el estado "done"
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStep('processing_payment');

      console.log('📡 Enviando solicitud de pago para postulante:', postulanteId);
      
      const { data: pagoData } = await api.post(
        `/postulantes/${postulanteId}/pago`
      );

      console.log('✅ Respuesta del servidor:', pagoData);

      if (pagoData.checkout_url) {
        console.log('🔗 Redirigiendo a Stripe URL:', pagoData.checkout_url);
        // CU05 - Paso 9b: C_Ctrl --> B_Int : + RetornarExitoYRedirigirPago()
        // Redirigir a Stripe - el usuario debe pagar
        window.location.href = pagoData.checkout_url;
      } else {
        console.error('❌ No hay checkout_url en la respuesta:', pagoData);
        throw new Error('No se pudo inicializar la pasarela de pagos. Respuesta: ' + JSON.stringify(pagoData));
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Error en el proceso de verificación/registro o inicio de pago.'
      );
      if (verificacionStep !== 'error') {
        setStep('verification');
      }
      setLoading(false);
    }
  };

  // CU05 - Paso Alternativo: 1. Act -> UI: SolicitarEliminarRegistroAnterior() y 2. UI -> Ctrl: deleteByEmail(email)
  const handleDeleteAndRetry = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/postulantes/delete-by-email', { email });
      setError('');
      alert(data.message || 'Registro anterior eliminado exitosamente. Procediendo a registrar nuevamente.');
      // Reintentar registro de forma automática
      await handleVerifyAndRegister();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
        'Error al eliminar el registro anterior. Por favor, verifique el correo o contacte a soporte.'
      );
      setLoading(false);
    }
  };

  // Prevenir navegación hacia atrás cuando estamos redirigiendo
  useEffect(() => {
    if (step === 'processing_payment') {
      const handlePopState = (e) => {
        e.preventDefault();
        alert(
          'Redirigiendo a la pasarela de pagos...'
        );
        window.history.pushState(null, '', window.location.href);
      };
      window.addEventListener('popstate', handlePopState);
      window.history.pushState(null, '', window.location.href);

      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [step]);

  return (
    <div className="min-h-screen bg-slate-950 px-4 relative overflow-hidden py-12 flex flex-col items-center justify-center">
      {/* Elementos decorativos */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-950/25 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      <div className="w-full max-w-2xl z-10">

        {/* ============ PASO 1: FORMULARIO ============ */}
        {step === 'form' && (
          <>
            <div className="text-center mb-8">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest font-mono">
                Paso 1 de 2
              </span>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-1">
                Formulario de Registro
              </h1>
              <p className="text-xs text-slate-400 mt-2">
                Completa todos los campos requeridos
              </p>
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-500/30 text-red-300 p-4 rounded-xl mb-6 text-sm text-center">
                ⚠️ {error}
              </div>
            )}

            {/* CU08: Alerta de postulante recurrente */}
            {esRecurrente && (
              <div className="bg-amber-950/40 border border-amber-500/30 text-amber-300 p-4 rounded-xl mb-6 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <span className="font-bold text-amber-200">Postulante Recurrente Detectado</span>
                </div>
                <p className="text-xs text-amber-300/80 ml-7">
                  {recurrenteMsg}. Los datos de tu registro anterior han sido precargados. Puedes actualizarlos si lo deseas.
                </p>
              </div>
            )}

            <div className="glass-panel p-8 rounded-2xl shadow-2xl">
              <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* CI con detección automática CU08 */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Carnet de Identidad (CI) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={ci}
                      onChange={(e) => setCi(e.target.value)}
                      onBlur={(e) => buscarCiRecurrente(e.target.value)}
                      placeholder="Ej. 8765432"
                      className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                    {buscandoCi && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                      </div>
                    )}
                  </div>
                  {ci.length >= 7 && !buscandoCi && !esRecurrente && (
                    <p className="text-xs text-emerald-400/70 mt-1 ml-1">✓ CI válido, sin registros previos</p>
                  )}
                </div>

                {/* Nombres */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    placeholder="Ej. Juan"
                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                {/* Apellidos */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    placeholder="Ej. Pérez García"
                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                {/* Fecha Nacimiento */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Fecha de Nacimiento *
                  </label>
                  <input
                    type="date"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                {/* Sexo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Sexo *
                  </label>
                  <select
                    value={sexo}
                    onChange={(e) => setSexo(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ej. juan@gmail.com"
                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej. 71234567"
                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Dirección */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Dirección de Domicilio
                  </label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Ej. Calle Principal 123, Apt 4B"
                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Ciudad */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Ciudad de Residencia *
                  </label>
                  <input
                    type="text"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                {/* Colegio */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Colegio de Procedencia *
                  </label>
                  <input
                    type="text"
                    value={colegio}
                    onChange={(e) => setColegio(e.target.value)}
                    placeholder="Ej. Colegio Nacional Florida"
                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                {/* Título Bachiller */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Título de Bachiller *
                  </label>
                  <input
                    type="text"
                    value={tituloBachiller}
                    onChange={(e) => setTituloBachiller(e.target.value)}
                    placeholder="Ej. Bachiller Técnico Humanístico"
                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                {/* Separador */}
                <div className="md:col-span-2 border-t border-slate-800/60 pt-4 mt-2">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                    📚 Preferencias Académicas
                  </h3>
                </div>

                {/* Primera Opción */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Primera Opción de Carrera *
                  </label>
                  <select
                    value={primeraOpcion}
                    onChange={(e) => setPrimeraOpcion(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="1">Ingeniería Informática</option>
                    <option value="2">Ingeniería de Sistemas</option>
                    <option value="3">Ingeniería en Redes</option>
                  </select>
                </div>

                {/* Segunda Opción */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Segunda Opción de Carrera *
                  </label>
                  <select
                    value={segundaOpcion}
                    onChange={(e) => setSegundaOpcion(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="1">Ingeniería Informática</option>
                    <option value="2">Ingeniería de Sistemas</option>
                    <option value="3">Ingeniería en Redes</option>
                  </select>
                </div>

                {/* Turno */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Turno de Preferencia *
                  </label>
                  <select
                    value={turno}
                    onChange={(e) => setTurno(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="Manana">Mañana</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noche">Noche</option>
                  </select>
                </div>

                {/* Botón Enviar */}
                <button
                  type="submit"
                  className="md:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-500/10 cursor-pointer mt-4"
                >
                  ➜ Continuar a Revisión
                </button>

                {/* Link Login */}
                <div className="md:col-span-2 text-center mt-4 border-t border-slate-800/60 pt-4">
                  <a
                    href="/login"
                    className="text-xs text-slate-400 hover:text-slate-200 transition-colors font-semibold"
                  >
                    ¿Ya tienes una cuenta? Ir al Login
                  </a>
                </div>
              </form>
            </div>
          </>
        )}

        {/* ============ PASO 2: VERIFICACIÓN DE DATOS ============ */}
        {step === 'verification' && (
          <>
            <div className="text-center mb-8">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest font-mono">
                Paso 2 de 2
              </span>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-1">
                Revisa tu Información
              </h1>
              <p className="text-xs text-slate-400 mt-2">
                Verifica que todos los datos sean correctos antes de continuar
              </p>
            </div>

            <div className="glass-panel p-8 rounded-2xl shadow-2xl">
              {/* CU08: Badge de recurrente en verificación */}
              {esRecurrente && (
                <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl px-4 py-2.5 mb-6 flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">Recurrente</span>
                  <span className="text-xs text-amber-300/70">Este es un postulante con registro anterior</span>
                </div>
              )}

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 space-y-4 mb-8 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CI */}
                  <div className="border-b border-slate-800 pb-2 md:col-span-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Documento (CI)
                    </span>
                    <span className="text-slate-200 font-semibold text-base">{ci}</span>
                  </div>

                  {/* Nombres y Apellidos */}
                  <div className="border-b border-slate-800 pb-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Nombres
                    </span>
                    <span className="text-slate-200 font-semibold">{nombres}</span>
                  </div>

                  <div className="border-b border-slate-800 pb-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Apellidos
                    </span>
                    <span className="text-slate-200 font-semibold">{apellidos}</span>
                  </div>

                  {/* Datos personales */}
                  <div className="border-b border-slate-800 pb-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Sexo
                    </span>
                    <span className="text-slate-200 font-semibold">{getSexoName(sexo)}</span>
                  </div>

                  <div className="border-b border-slate-800 pb-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Fecha de Nacimiento
                    </span>
                    <span className="text-slate-200 font-semibold">{fechaNacimiento}</span>
                  </div>

                  {/* Contacto */}
                  <div className="border-b border-slate-800 pb-2 md:col-span-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Correo Electrónico
                    </span>
                    <span className="text-slate-200 font-semibold">{email}</span>
                  </div>

                  <div className="border-b border-slate-800 pb-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Teléfono
                    </span>
                    <span className="text-slate-200 font-semibold">{telefono || 'No indicado'}</span>
                  </div>

                  <div className="border-b border-slate-800 pb-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Ciudad
                    </span>
                    <span className="text-slate-200 font-semibold">{ciudad}</span>
                  </div>

                  {/* Académicos */}
                  <div className="border-b border-slate-800 pb-2 md:col-span-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Colegio de Procedencia
                    </span>
                    <span className="text-slate-200 font-semibold">{colegio}</span>
                  </div>

                  <div className="border-b border-slate-800 pb-2 md:col-span-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Título de Bachiller
                    </span>
                    <span className="text-slate-200 font-semibold">{tituloBachiller}</span>
                  </div>

                  {/* Preferencias */}
                  <div className="border-b border-slate-800 pb-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      1ª Opción de Carrera
                    </span>
                    <span className="text-slate-200 font-semibold">
                      {getCarreraName(primeraOpcion)}
                    </span>
                  </div>

                  <div className="border-b border-slate-800 pb-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      2ª Opción de Carrera
                    </span>
                    <span className="text-slate-200 font-semibold">
                      {getCarreraName(segundaOpcion)}
                    </span>
                  </div>

                  <div className="border-b border-slate-800 pb-2 md:col-span-2">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Turno de Preferencia
                    </span>
                    <span className="text-slate-200 font-semibold">{getTurnoName(turno)}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-950/50 border border-red-500/30 text-red-300 p-4 rounded-xl mb-6 text-sm text-center">
                  ⚠️ {error}
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3 flex-col md:flex-row">
                <button
                  onClick={() => setStep('form')}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3.5 rounded-xl font-semibold transition-all duration-300 cursor-pointer"
                >
                  ← Editar Información
                </button>

                <button
                  onClick={handleVerifyAndRegister}
                  disabled={loading}
                  className={`flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-3.5 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-green-500/10 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Verificando...
                    </>
                  ) : (
                    <>✓ Verificar e Ir a Pago</>
                  )}
                </button>
              </div>

              {/* Botón para eliminar registro anterior si hay error de email duplicado */}
              {error && error.includes('ya está registrado') && (
                <div className="mt-4">
                  <button
                    onClick={handleDeleteAndRetry}
                    disabled={loading}
                    className={`w-full bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Eliminando registro anterior...
                      </>
                    ) : (
                      <>🔄 Eliminar Registro Anterior y Reintentar</>
                    )}
                  </button>
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    Esto eliminará completamente tu registro anterior y permitirá re-registrarte con el mismo correo.
                  </p>
                </div>
              )}

            </div>
          </>
        )}

        {/* ============ CU06: PANTALLA DE VERIFICACIÓN SEGIP/SEDUCA ============ */}
        {step === 'validating' && (
          <div className="glass-panel p-10 rounded-2xl shadow-2xl text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
                {verificacionStep === 'error' ? (
                  <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                ) : verificacionStep === 'done' ? (
                  <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500/30 border-t-blue-400"></div>
                )}
              </div>

              <h2 className="text-xl font-bold text-slate-100 mb-2">
                {verificacionStep === 'error' ? 'Error en Verificación' : verificacionStep === 'done' ? '¡Verificación Exitosa!' : 'Verificando datos con entidades externas'}
              </h2>
              <p className="text-sm text-slate-400">
                {verificacionMsg}
              </p>
            </div>

            {/* Progreso visual de verificación */}
            <div className="space-y-4 max-w-sm mx-auto text-left">
              {/* Paso: Registro */}
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  verificacionStep === 'registrando' ? 'bg-blue-500/20 border border-blue-500/40' : 'bg-emerald-500/20 border border-emerald-500/40'
                }`}>
                  {verificacionStep === 'registrando' ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-blue-500/30 border-t-blue-400"></div>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${verificacionStep === 'registrando' ? 'text-blue-300 font-semibold' : 'text-emerald-300'}`}>
                  Registro de datos
                </span>
              </div>

              {/* Paso: SEGIP */}
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  verificacionStep === 'segip' ? 'bg-blue-500/20 border border-blue-500/40' 
                  : ['seduca', 'done'].includes(verificacionStep) ? 'bg-emerald-500/20 border border-emerald-500/40'
                  : verificacionStep === 'error' ? 'bg-red-500/20 border border-red-500/40'
                  : 'bg-slate-800 border border-slate-700'
                }`}>
                  {verificacionStep === 'segip' ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-blue-500/30 border-t-blue-400"></div>
                  ) : ['seduca', 'done'].includes(verificacionStep) ? (
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : verificacionStep === 'error' ? (
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-bold">2</span>
                  )}
                </div>
                <span className={`text-sm ${
                  verificacionStep === 'segip' ? 'text-blue-300 font-semibold' 
                  : ['seduca', 'done'].includes(verificacionStep) ? 'text-emerald-300'
                  : verificacionStep === 'error' ? 'text-red-300'
                  : 'text-slate-500'
                }`}>
                  Verificación SEGIP (Identidad)
                </span>
              </div>

              {/* Paso: SEDUCA */}
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  verificacionStep === 'seduca' ? 'bg-blue-500/20 border border-blue-500/40'
                  : verificacionStep === 'done' ? 'bg-emerald-500/20 border border-emerald-500/40'
                  : 'bg-slate-800 border border-slate-700'
                }`}>
                  {verificacionStep === 'seduca' ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-blue-500/30 border-t-blue-400"></div>
                  ) : verificacionStep === 'done' ? (
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-bold">3</span>
                  )}
                </div>
                <span className={`text-sm ${
                  verificacionStep === 'seduca' ? 'text-blue-300 font-semibold' 
                  : verificacionStep === 'done' ? 'text-emerald-300'
                  : 'text-slate-500'
                }`}>
                  Verificación SEDUCA (Título Bachiller)
                </span>
              </div>
            </div>

            {/* Botón volver en caso de error */}
            {verificacionStep === 'error' && (
              <div className="mt-8">
                <p className="text-xs text-red-300/70 mb-4">{verificacionMsg}</p>
                <button
                  onClick={() => { setStep('verification'); setLoading(false); }}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-xl font-semibold transition-all cursor-pointer text-sm"
                >
                  ← Volver a Revisión
                </button>
              </div>
            )}
          </div>
        )}



      </div>
    </div>
  );
}
