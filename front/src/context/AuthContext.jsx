// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import config from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar desde localStorage al iniciar
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser  = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }

    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const resp = await axios.post(`${config.API_URL}/api/auth/login`, {
      username,
      password,
    });

    const { token: newToken, user: userData } = resp.data;

    setToken(newToken);
    setUser(userData);

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));

    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const register = async (username, password) => {
    await axios.post(`${config.API_URL}/api/auth/register`, {
      username,
      password,
    });
    // después de registrar, puedes:
    // - forzar login automático
    // - o devolver control al componente
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
