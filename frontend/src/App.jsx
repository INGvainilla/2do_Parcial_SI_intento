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
