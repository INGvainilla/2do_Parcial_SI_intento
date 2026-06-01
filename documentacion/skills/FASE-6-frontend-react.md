---
name: ficct-fase6-frontend-react
description: >
  Implementa el frontend React 18 + Vite + Tailwind CSS completo para el sistema CUP-FICCT.
  Cubre todas las interfaces del Ciclo 1: Login, Dashboard por rol, Gestion Usuarios,
  Preinscripcion, Verificacion, Pago, Busqueda Postulantes, Planificacion Grupos,
  Asignacion Docentes y Simulacro.
  Prerequisito: FASES 1-5 completadas (backend funcional con todos los endpoints).
  Trigger: "frontend", "react", "interfaz", "UI", "vistas", "componentes".
---

# FASE 6 — Frontend React (Todas las interfaces del Ciclo 1)

> **Objetivo**: Crear el frontend SPA completo con React 18 + Vite + Tailwind CSS
> que consume la API del backend Laravel y cubre todos los Boundary (IU_*) de los
> diagramas de secuencia del Ciclo 1.

---

## INTERFACES A IMPLEMENTAR (segun diagramas)

| IU Diagrama | Pagina React | Actor | Ruta |
|-------------|-------------|-------|------|
| IU_Login | LoginPage | Todos | `/login` |
| IU_Dashboard | DashboardPage | Todos | `/dashboard` |
| IU_Usuarios | UsersPage | Admin | `/admin/usuarios` |
| IU_Preinscripcion | PreinscripcionPage | Postulante | `/preinscripcion` |
| IU_Inscripcion | InscripcionPage | Postulante | `/inscripcion` |
| IU_Busqueda | BusquedaPage | Admin/Coord | `/admin/postulantes` |
| IU_Grupos | GruposPage | Admin/Coord | `/admin/grupos` |
| IU_Docentes | DocentesPage | Admin/Coord | `/admin/docentes` |
| IU_Simulacro | SimulacroPage | Postulante | `/simulacro` |

---

## PASO 1 — Crear proyecto React con Vite

```bash
cd "C:\Users\mujic\OneDrive\Escritorio\2do Parcial SI\2do_Parcial_SI"
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install react-router-dom axios tailwindcss @tailwindcss/vite
```

---

## PASO 2 — Configurar Tailwind CSS v4 (Vite plugin)

Editar `frontend/vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
```

Editar `frontend/src/index.css`:

```css
@import "tailwindcss";
```

---

## PASO 3 — Estructura de carpetas

```
frontend/src/
├── main.jsx
├── App.jsx
├── index.css
├── api/
│   └── axios.js
├── context/
│   └── AuthContext.jsx
├── components/
│   ├── Layout.jsx
│   ├── ProtectedRoute.jsx
│   └── Navbar.jsx
├── pages/
│   ├── LoginPage.jsx
│   ├── DashboardPage.jsx
│   ├── admin/
│   │   ├── UsersPage.jsx
│   │   ├── BusquedaPostulantesPage.jsx
│   │   ├── GruposPage.jsx
│   │   └── DocentesPage.jsx
│   └── postulante/
│       ├── PreinscripcionPage.jsx
│       ├── InscripcionPage.jsx
│       └── SimulacroPage.jsx
```

---

## PASO 4 — Axios configurado

Crear `frontend/src/api/axios.js`:

```js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## PASO 5 — AuthContext

Crear `frontend/src/context/AuthContext.jsx`:

```jsx
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    const { data } = await api.post('/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (e) {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

---

## PASO 6 — ProtectedRoute

Crear `frontend/src/components/ProtectedRoute.jsx`:

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}
```

---

## PASO 7 — Layout y Navbar

Crear `frontend/src/components/Navbar.jsx`:

```jsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  const adminLinks = [
    { to: '/admin/usuarios', label: 'Usuarios' },
    { to: '/admin/postulantes', label: 'Postulantes' },
    { to: '/admin/grupos', label: 'Grupos' },
    { to: '/admin/docentes', label: 'Docentes' },
  ];

  const postulanteLinks = [
    { to: '/preinscripcion', label: 'Preinscripcion' },
    { to: '/inscripcion', label: 'Inscripcion' },
    { to: '/simulacro', label: 'Simulacro' },
  ];

  const links = ['Administrador', 'Coordinador'].includes(user?.role)
    ? adminLinks
    : user?.role === 'Postulante'
    ? postulanteLinks
    : [];

  return (
    <nav className="bg-blue-900 text-white px-6 py-3 flex items-center justify-between">
      <Link to="/dashboard" className="font-bold text-lg">CUP FICCT</Link>
      <div className="flex gap-4 items-center">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="hover:text-blue-300 text-sm">{l.label}</Link>
        ))}
        <span className="text-xs bg-blue-700 px-2 py-1 rounded">{user?.role}</span>
        <button onClick={logout} className="text-sm hover:text-red-300">Salir</button>
      </div>
    </nav>
  );
}
```

Crear `frontend/src/components/Layout.jsx`:

```jsx
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
```

---

## PASO 8 — LoginPage

Crear `frontend/src/pages/LoginPage.jsx`:

```jsx
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
      setError(err.response?.data?.message || 'Error de autenticacion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-600">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-blue-900 mb-2">Sistema CUP FICCT</h1>
        <p className="text-center text-gray-500 mb-6">Ingrese sus credenciales</p>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

        <label className="block text-sm font-medium text-gray-700 mb-1">Correo electronico</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-4 focus:ring-2 focus:ring-blue-500 outline-none" required />

        <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 mb-6 focus:ring-2 focus:ring-blue-500 outline-none" required />

        <button type="submit" disabled={loading}
          className="w-full bg-blue-700 text-white py-2 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50">
          {loading ? 'Ingresando...' : 'Iniciar Sesion'}
        </button>

        <a href="#" className="block text-center text-sm text-blue-600 mt-4 hover:underline">
          Olvidaste tu contrasena?
        </a>
      </form>
    </div>
  );
}
```

---

## PASO 9 — DashboardPage

Crear `frontend/src/pages/DashboardPage.jsx`:

```jsx
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Bienvenido, {user?.name}</h1>
      <p className="text-gray-600 mt-2">Rol: <span className="font-semibold">{user?.role}</span></p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {user?.role === 'Administrador' && (
          <>
            <DashCard title="Usuarios" desc="Gestionar perfiles del sistema" />
            <DashCard title="Postulantes" desc="Buscar y consultar inscritos" />
            <DashCard title="Grupos" desc="Planificacion y asignacion" />
          </>
        )}
        {user?.role === 'Postulante' && (
          <>
            <DashCard title="Preinscripcion" desc="Completar datos y verificar" />
            <DashCard title="Inscripcion" desc="Realizar pago de matricula" />
            <DashCard title="Simulacro" desc="Practicar examen de ingreso" />
          </>
        )}
      </div>
    </div>
  );
}

function DashCard({ title, desc }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
      <h3 className="font-bold text-lg text-blue-900">{title}</h3>
      <p className="text-gray-500 text-sm mt-1">{desc}</p>
    </div>
  );
}
```

---

## PASO 10 — SimulacroPage (la mas compleja)

Crear `frontend/src/pages/postulante/SimulacroPage.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react';
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

  // Auto-submit cuando se acaba el tiempo
  useEffect(() => {
    if (tiempo <= 0 && fase === 'examen') {
      enviarRespuestas();
    }
  }, [tiempo, fase]);

  const iniciarSimulacro = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/simulacro/generar');
      setPreguntas(data.preguntas);
      setTiempo(data.simulacro.tiempo_limite_minutos * 60);
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
    setLoading(true);
    const payload = Object.entries(respuestas).map(([pregunta_id, respuesta]) => ({
      pregunta_id: parseInt(pregunta_id),
      respuesta,
    }));

    try {
      const { data } = await api.post('/simulacro/calificar', { respuestas: payload });
      setResultado(data);
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
      <div className="max-w-2xl mx-auto text-center py-12">
        <h1 className="text-3xl font-bold text-blue-900 mb-4">Simulacro de Examen CUP</h1>
        <div className="bg-white p-8 rounded-xl shadow">
          <p className="text-gray-600 mb-2">40 preguntas (10 por materia)</p>
          <p className="text-gray-600 mb-2">Tiempo limite: 90 minutos</p>
          <p className="text-gray-600 mb-6">Materias: Matematicas, Fisica, Quimica, Lenguaje</p>
          {error && <p className="text-red-600 mb-4">{error}</p>}
          <button onClick={iniciarSimulacro} disabled={loading}
            className="bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50">
            {loading ? 'Cargando...' : 'Iniciar Simulacro'}
          </button>
        </div>
      </div>
    );
  }

  // PANTALLA EXAMEN
  if (fase === 'examen') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="sticky top-0 bg-white p-4 rounded-b-xl shadow z-10 flex justify-between items-center mb-6">
          <span className="font-bold text-blue-900">
            Respondidas: {Object.keys(respuestas).length} / {preguntas.length}
          </span>
          <span className={`font-mono text-lg font-bold ${tiempo < 300 ? 'text-red-600' : 'text-gray-800'}`}>
            {formatTiempo()}
          </span>
          <button onClick={enviarRespuestas} disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700">
            Finalizar
          </button>
        </div>

        {preguntas.map((pregunta, idx) => (
          <div key={pregunta.id} className="bg-white p-6 rounded-xl shadow mb-4">
            <p className="text-xs text-blue-600 font-semibold mb-1">{pregunta.materia} — Pregunta {idx + 1}</p>
            <p className="font-medium text-gray-800 mb-3">{pregunta.enunciado}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {pregunta.opciones.map((opcion, opIdx) => (
                <button key={opIdx}
                  onClick={() => seleccionarRespuesta(pregunta.id, opcion)}
                  className={`text-left p-3 rounded-lg border transition ${
                    respuestas[pregunta.id] === opcion
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}>
                  {opcion}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // PANTALLA RESULTADO
  if (fase === 'resultado' && resultado) {
    const { resultado: res, por_materia, detalle } = resultado;
    return (
      <div className="max-w-4xl mx-auto">
        <div className={`p-8 rounded-xl shadow text-center mb-8 ${res.aprobado ? 'bg-green-50' : 'bg-red-50'}`}>
          <h1 className="text-3xl font-bold mb-2">
            {res.aprobado ? 'Aprobado!' : 'Reprobado'}
          </h1>
          <p className="text-5xl font-bold my-4">{res.nota_sobre_100}%</p>
          <p className="text-gray-600">
            {res.aciertos} aciertos / {res.errores} errores de {res.total_respondidas} preguntas
          </p>
        </div>

        <h2 className="text-xl font-bold mb-4">Resultado por Materia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {por_materia.map((m) => (
            <div key={m.materia} className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-bold text-gray-800">{m.materia}</h3>
              <p className="text-2xl font-bold text-blue-700">{m.porcentaje}%</p>
              <p className="text-sm text-gray-500">{m.aciertos}/{m.total} correctas</p>
            </div>
          ))}
        </div>

        <button onClick={() => { setFase('inicio'); setRespuestas({}); setResultado(null); }}
          className="bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-800">
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return null;
}
```

---

## PASO 11 — App.jsx con Router

Crear `frontend/src/App.jsx`:

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/admin/UsersPage';
import BusquedaPostulantesPage from './pages/admin/BusquedaPostulantesPage';
import GruposPage from './pages/admin/GruposPage';
import DocentesPage from './pages/admin/DocentesPage';
import PreinscripcionPage from './pages/postulante/PreinscripcionPage';
import InscripcionPage from './pages/postulante/InscripcionPage';
import SimulacroPage from './pages/postulante/SimulacroPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Admin/Coordinador */}
            <Route path="/admin/usuarios" element={
              <ProtectedRoute roles={['Administrador']}><UsersPage /></ProtectedRoute>
            } />
            <Route path="/admin/postulantes" element={
              <ProtectedRoute roles={['Administrador', 'Coordinador']}><BusquedaPostulantesPage /></ProtectedRoute>
            } />
            <Route path="/admin/grupos" element={
              <ProtectedRoute roles={['Administrador', 'Coordinador']}><GruposPage /></ProtectedRoute>
            } />
            <Route path="/admin/docentes" element={
              <ProtectedRoute roles={['Administrador', 'Coordinador']}><DocentesPage /></ProtectedRoute>
            } />

            {/* Postulante */}
            <Route path="/preinscripcion" element={
              <ProtectedRoute roles={['Postulante']}><PreinscripcionPage /></ProtectedRoute>
            } />
            <Route path="/inscripcion" element={
              <ProtectedRoute roles={['Postulante']}><InscripcionPage /></ProtectedRoute>
            } />
            <Route path="/simulacro" element={
              <ProtectedRoute roles={['Postulante']}><SimulacroPage /></ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

---

## PASO 12 — Paginas admin placeholder (para que compilen)

Cada pagina admin sigue el mismo patron. Ejemplo `UsersPage.jsx`:

```jsx
import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users').then(({ data }) => setUsers(data.data || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Gestion de Usuarios</h1>
      <table className="w-full bg-white rounded-xl shadow overflow-hidden">
        <thead className="bg-blue-900 text-white">
          <tr>
            <th className="p-3 text-left">Nombre</th>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Rol</th>
            <th className="p-3 text-left">Estado</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="p-3">{u.name}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3">{u.role}</td>
              <td className="p-3">{u.active ? 'Activo' : 'Inactivo'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

Repetir patron similar para:
- `BusquedaPostulantesPage.jsx` → consume `GET /api/postulantes`
- `GruposPage.jsx` → consume `GET /api/grupos` + boton "Asignacion Masiva"
- `DocentesPage.jsx` → consume `GET /api/docentes` + formulario asignar
- `PreinscripcionPage.jsx` → formulario que envia `POST /api/postulantes`
- `InscripcionPage.jsx` → muestra estado y boton "Pagar" que llama `POST /api/postulantes/{id}/pago`

---

## PASO 13 — Iniciar frontend

```bash
cd frontend
npm run dev
```

Abrir `http://localhost:5173/login`

---

## CRITERIO DE ACEPTACION

- [ ] `npm run dev` inicia sin errores
- [ ] Login con credenciales validas redirige a `/dashboard`
- [ ] Login con credenciales invalidas muestra error
- [ ] Navbar muestra links segun rol del usuario
- [ ] Admin ve: Usuarios, Postulantes, Grupos, Docentes
- [ ] Postulante ve: Preinscripcion, Inscripcion, Simulacro
- [ ] Rutas protegidas redirigen a login si no hay token
- [ ] Roles incorrectos redirigen a dashboard (403 en backend)
- [ ] Simulacro genera 40 preguntas, muestra temporizador
- [ ] Simulacro califica y muestra resultados por materia
- [ ] Proxy Vite redirige `/api/*` al backend en puerto 8000
