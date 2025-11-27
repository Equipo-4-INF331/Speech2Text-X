import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';
import config from '../config';

const AudiosContext = createContext(null);
const BASE_URL = config.API_URL;

export const AudiosProvider = ({ children }) => {
  const [transcripciones, setAudios] = useState([]);
  const [loading, setLoadingAudios] = useState(true);
  const [error, setErrorAudios] = useState('');

  const fetchHistorial = async (filters = {}) => {
    setLoadingAudios(true);
    setErrorAudios('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/audios/filter`, {
        params: filters,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.status === 304) return;

      if (Array.isArray(response.data.data)) {
        setAudios(response.data.data);
      } else if (response.data.error) {
        setErrorAudios(`Error del servidor: ${response.data.error}`);
      }
    } catch (e) {
      console.error('Error al obtener audios:', e);
      setErrorAudios('Error al obtener el historial');
    } finally {
      setLoadingAudios(false);
    }
  };

  return (
    <AudiosContext.Provider value={{ transcripciones, fetchHistorial, loading, error }}>
      {children}
    </AudiosContext.Provider>
  );
};

export const useAudios = () => useContext(AudiosContext);
