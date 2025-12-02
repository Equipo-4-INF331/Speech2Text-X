// src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import './LoginRegister.css';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import config from '../config';

const BASE_URL = config.API_URL;

const Register = () => {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    setLoading(true);
    try {
        await register(username, password);
        await login(username, password);
        navigate('/');
    } catch (err) {
        console.error(err);
        setError(
            err.response?.data?.message || 'Error al registrarse'
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
          <h2 className="auth-title">Registro</h2>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-label">
              Usuario
              <input
                type="text"             // mejor "text" que "username"
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
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>

          <p className="auth-register-text">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="auth-link">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
