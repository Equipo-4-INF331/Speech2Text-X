// src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
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
      <h2>Registro</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Usuario
          <input
            type="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Creando cuenta...' : 'Registrarse'}
        </button>
      </form>

      <p>
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </div>
  );
};

export default Register;
