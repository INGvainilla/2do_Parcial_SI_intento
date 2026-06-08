import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function SimulacroPage() {
  const [fase, setFase] = useState('inicio'); // inicio | examen | resultado
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [resultado, setResultado] = useState(null);
  const [tiempo, setTiempo] = useState(90 * 60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Temporizador
  useEffect(() => {
    if (fase !== 'examen' || tiempo <= 0) return;
    const interval = setInterval(() => setTiempo((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [fase, tiempo]);

  // Auto-submit
  useEffect(() => {
    if (tiempo <= 0 && fase === 'examen') {
      enviarRespuestas();
    }
  }, [tiempo, fase]);

  const iniciarSimulacro = async () => {
    // CU23 - Paso 1: Act -> B_Int : + IniciarSimulacro()
    // El postulante inicia la práctica.
    setLoading(true);
    setError('');
    try {
      // CU23 - Paso 2: B_Int -> C_Ctrl : + generar()
      const { data } = await api.get('/simulacro/generar');
      
      // CU23 - Paso 5: C_Ctrl --> B_Int : + RetornarPreguntas()
      setPreguntas(data.preguntas);
      setTiempo(data.simulacro.tiempo_limite_minutos * 60);

      // CU23 - Paso 6: B_Int --> Act : + MostrarTemporizadorYPreguntas()
      setFase('examen');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al generar simulacro');
    } finally {
      setLoading(false);
    }
  };

  const seleccionarRespuesta = (preguntaId, opcion) => {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: opcion }));
  };

  const enviarRespuestas = async () => {
    // CU23 - Paso 7: Act -> B_Int : + EnviarRespuestas(respuestas)
    // El postulante envía el examen completado.
    setLoading(true);
    const payload = Object.entries(respuestas).map(([pregunta_id, respuesta]) => ({
      pregunta_id: parseInt(pregunta_id),
      respuesta,
    }));

    try {
      // CU23 - Paso 8: B_Int -> C_Ctrl : + calificar(request)
      const { data } = await api.post('/simulacro/calificar', { respuestas: payload });
      
      // CU23 - Paso 9: C_Ctrl --> B_Int : + RetornarNotaSimulacro()
      setResultado(data);

      // CU23 - Paso 10: B_Int --> Act : + MostrarResultadosSimulacro()
      setFase('resultado');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al calificar');
    } finally {
      setLoading(false);
    }
  };

  const formatTiempo = () => {
    const min = Math.floor(tiempo / 60);
    const seg = tiempo % 60;
    return `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
  };

  // PANTALLA INICIO
  if (fase === 'inicio') {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="text-center mb-8">
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Preparación</span>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight mt-1">Simulacro de Examen CUP</h1>
          <p className="text-sm text-slate-400 mt-2">Prueba oficial auto-evaluada de ingreso</p>
        </div>

        <div className="glass-panel p-8 rounded-2xl shadow-2xl">
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-slate-400 text-sm">Cantidad total de reactivos</span>
              <span className="font-semibold text-slate-200">40 Preguntas</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-slate-400 text-sm">Tiempo máximo permitido</span>
              <span className="font-semibold text-slate-200">60 Minutos (1 hora)</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-slate-400 text-sm">Distribución temática</span>
              <span className="font-semibold text-slate-200">10 por materia</span>
            </div>
            <div className="flex justify-between items-center pb-3">
              <span className="text-slate-400 text-sm">Materias evaluadas</span>
              <span className="font-semibold text-blue-400">Computación, Matemáticas, Física, Inglés</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-950/40 border border-red-500/20 text-red-300 p-3 rounded-lg mb-6 text-sm text-center">
              {error}
            </div>
          )}

          <button 
            onClick={iniciarSimulacro} 
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-500/10 cursor-pointer"
          >
            {loading ? 'Inicializando reactivos...' : 'Iniciar examen de práctica'}
          </button>
        </div>
      </div>
    );
  }

  // PANTALLA EXAMEN
  if (fase === 'examen') {
    return (
      <div className="max-w-4xl mx-auto pb-16">
        <div className="sticky top-[80px] backdrop-blur-md bg-slate-950/90 border border-slate-800 p-4 rounded-2xl shadow-2xl z-40 flex justify-between items-center mb-8">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Avance del Examen</span>
            <span className="font-bold text-slate-200 text-sm">
              {Object.keys(respuestas).length} de {preguntas.length} respondidas
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tiempo Restante</span>
              <span className={`font-mono text-xl font-bold tracking-widest ${tiempo < 300 ? 'text-red-500 animate-pulse' : 'text-slate-200'}`}>
                {formatTiempo()}
              </span>
            </div>
            
            <button 
              onClick={enviarRespuestas} 
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer"
            >
              Finalizar y Calificar
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {preguntas.map((pregunta, idx) => (
            <div key={pregunta.id} className="glass-panel p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] bg-blue-900/50 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  {pregunta.materia}
                </span>
                <span className="text-xs text-slate-500 font-semibold">Pregunta {idx + 1}</span>
              </div>
              
              <p className="text-base text-slate-200 font-medium mb-4 leading-relaxed">{pregunta.enunciado}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pregunta.opciones.map((opcion, opIdx) => {
                  const isSelected = respuestas[pregunta.id] === opcion;
                  return (
                    <button 
                      key={opIdx}
                      onClick={() => seleccionarRespuesta(pregunta.id, opcion)}
                      className={`text-left p-3.5 rounded-xl border text-sm transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-600/10 text-blue-300 font-semibold'
                          : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {opcion}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // PANTALLA RESULTADO
  if (fase === 'resultado' && resultado) {
    const { resultado: res, por_materia, detalle } = resultado;
    return (
      <div className="max-w-4xl mx-auto py-6">
        <div className={`p-8 rounded-3xl border shadow-2xl text-center mb-8 ${
          res.aprobado 
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
        }`}>
          <span className="text-xs uppercase font-bold tracking-widest">Resultado de la Evaluación</span>
          <h1 className="text-4xl font-extrabold mt-2">
            {res.aprobado ? 'Aprobado' : 'Reprobado'}
          </h1>
          <p className="text-6xl font-black my-6 tracking-tighter">{res.nota_sobre_100}%</p>
          <p className="text-sm opacity-80 max-w-md mx-auto leading-relaxed">
            Obtuvo {res.aciertos} aciertos y {res.errores} errores de {res.total_respondidas} preguntas completadas.
          </p>
        </div>

        <h2 className="text-lg font-semibold text-slate-200 mb-4 tracking-tight">Desempeño por Materia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {por_materia.map((m) => (
            <div key={m.materia} className="glass-panel p-5 rounded-2xl">
              <span className="text-xs text-slate-400 font-bold uppercase">{m.materia}</span>
              <div className="flex justify-between items-end mt-2">
                <span className="text-2xl font-bold text-slate-200">{m.porcentaje}%</span>
                <span className="text-xs text-slate-400 font-semibold">{m.aciertos} de {m.total} aciertos</span>
              </div>
              {/* Barra de progreso visual con CSS */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${m.porcentaje}%` }}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button 
            onClick={() => { setFase('inicio'); setRespuestas({}); setResultado(null); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer"
          >
            Realizar nuevo intento
          </button>
        </div>
      </div>
    );
  }

  return null;
}
