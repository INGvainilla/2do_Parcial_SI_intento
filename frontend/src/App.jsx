import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/admin/UsersPage';
import BusquedaPostulantesPage from './pages/admin/BusquedaPostulantesPage';
import GruposPage from './pages/admin/GruposPage';
import DocentesPage from './pages/admin/DocentesPage';
import NotasAdminPage from './pages/admin/NotasAdminPage';
import AdmisionesPage from './pages/admin/AdmisionesPage';
import ReportesPage from './pages/admin/ReportesPage';
import PreinscripcionPage from './pages/postulante/PreinscripcionPage';
import InscripcionPage from './pages/postulante/InscripcionPage';
import SimulacroPage from './pages/postulante/SimulacroPage';
import Pago from './pages/Pago';
import PagoExitoso from './pages/PagoExitoso';
import PagoCancelado from './pages/PagoCancelado';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Admin/Coordinador */}
            <Route path="/admin/usuarios" element={
              <ProtectedRoute roles={['Administrador']}><UsersPage /></ProtectedRoute>
            } />
            <Route path="/admin/postulantes" element={
              <ProtectedRoute roles={['Administrador', 'Coordinador', 'Docente']}><BusquedaPostulantesPage /></ProtectedRoute>
            } />
            <Route path="/admin/grupos" element={
              <ProtectedRoute roles={['Administrador', 'Coordinador']}><GruposPage /></ProtectedRoute>
            } />
            <Route path="/admin/docentes" element={
              <ProtectedRoute roles={['Administrador', 'Coordinador']}><DocentesPage /></ProtectedRoute>
            } />
            <Route path="/admin/notas" element={
              <ProtectedRoute roles={['Administrador']}><NotasAdminPage /></ProtectedRoute>
            } />
            <Route path="/admin/admisiones" element={
              <ProtectedRoute roles={['Administrador', 'Coordinador']}><AdmisionesPage /></ProtectedRoute>
            } />
            <Route path="/admin/reportes" element={
              <ProtectedRoute roles={['Administrador', 'Coordinador']}><ReportesPage /></ProtectedRoute>
            } />

            {/* Postulante (Protegido) */}
            <Route path="/simulacro" element={
              <ProtectedRoute roles={['Postulante']}><SimulacroPage /></ProtectedRoute>
            } />
          </Route>

          {/* Rutas Publicas de Registro y Pago */}
          <Route path="/preinscripcion" element={<PreinscripcionPage />} />
          <Route path="/inscripcion" element={<InscripcionPage />} />
          <Route path="/inscripcion/pago/:postulanteId" element={<Pago />} />
          <Route path="/inscripcion/exitosa" element={<PagoExitoso />} />
          <Route path="/inscripcion/cancelada" element={<PagoCancelado />} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
