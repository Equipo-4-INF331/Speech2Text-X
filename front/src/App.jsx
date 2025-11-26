// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

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
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid #ddd' }}>
        <div>
          <Link to="/">Speech2Text-X</Link>{" | "}
          <Link to="/historial">Historial</Link>
        </div>
        <div>
          {user && (
            <>
              <span style={{ marginRight: 8 }}>👋 {user.username}</span>
              <button onClick={logout}>Cerrar sesión</button>
            </>
          )}
        </div>
      </header>
      <main>{children}</main>
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
          <Layout>
            <Historial />
          </Layout>
        </ProtectedRoute>
      }
    />

    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <AuthProvider>
    <Router>
      <AppRoutes />
    </Router>
  </AuthProvider>
);

export default App;