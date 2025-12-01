// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AudiosProvider } from './context/AudiosContext';

import MainPage from './pages/MainPage';
import Historial from './pages/Historial';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Cargando sesión...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const Layout = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="">
      {/* Bloque de sesión flotando arriba a la derecha */}
      {user && (
        <div className="absolute top-3 right-4 flex items-center gap-1 z-10">
          <span>Usuario: {user.username} |</span>
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      )}

      <main>
        {children}
      </main>
    </div>
  );
};

const AppRoutes = () => (
  <Routes>
    {/* Rutas públicas */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />

    {/* Rutas protegidas */}
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <Layout>
            <MainPage />
          </Layout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/historial"
      element={
        <ProtectedRoute>
          <Historial />
        </ProtectedRoute>
      }
    />

    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <AuthProvider>
    <AudiosProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AudiosProvider>
  </AuthProvider>
);

export default App;