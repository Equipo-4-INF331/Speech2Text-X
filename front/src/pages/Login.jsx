// src/pages/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './LoginRegister.css';
import config from '../config';

const BASE_URL = config.API_URL;

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/'); // al loguear → página principal
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Error al iniciar sesión'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <h1 className="main-title-reg">Speech2Text X</h1>
      <div className='auth-main'>
        <div className={`auth-card ${error ? 'auth-card--error' : ''}`}>
          <h2 className="auth-title">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-label">
              Usuario
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className={`auth-input ${error ? 'auth-input--error' : ''}`}
              />
            </label>

            <label className="auth-label">
              Contraseña
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className={`auth-input ${error ? 'auth-input--error' : ''}`}
              />
            </label>

            {error && (
              <p className="auth-error-text">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="auth-button"
            >
              {loading ? 'Ingresando...' : 'Entrar'}
            </button>
          </form>

          <p className="auth-register-text">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="auth-link">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
