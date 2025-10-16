import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import axios from 'axios';
import './Historial.css';
import SeleccionHistorial from './SeleccionHistorial';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const USERNAME = 'alberto';

// Usamos forwardRef para exponer funciones al padre
const Historial = forwardRef((props, ref) => {
  const [transcripciones, setTranscripciones] = useState([]);
  const [selectedTranscripcion, setSelectedTranscripcion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistorial = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/audios/historial`, {
        username: USERNAME
      });
      console.log('Historial recibido:', response.data.data);
      setTranscripciones(response.data.data || []);
    } catch (err) {
      console.error(err);
      setError('Error al obtener el historial');
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    refresh: fetchHistorial
  }));

  useEffect(() => {
    fetchHistorial();
  }, []);

  return (
    <div className='historial-page'>
      <aside className='sidebar'>
        <h2 style={{textAlign:'center'}}>Historial</h2>
        {loading ? (
          <p>Cargando...</p>
        ) : error ? (
          <p>{error}</p>
        ) : transcripciones.length === 0 ? (
          <p>No hay transcripciones</p>
        ) : (
          <ul className='sidebar-list'>
            {transcripciones.map((t, index) => (
              <li
                key={index}
                className='sidebar-item'
                onClick={() => setSelectedTranscripcion(t)}
              >
                {t.name}
              </li>
            ))}
          </ul>
        )}
      </aside>

      <main className='main-content'>
        <SeleccionHistorial
          show={selectedTranscripcion !== null}
          onClose={() => setSelectedTranscripcion(null)}
          transcripcion={selectedTranscripcion || {}}
        />
      </main>
    </div>
  );
});

export default Historial;
