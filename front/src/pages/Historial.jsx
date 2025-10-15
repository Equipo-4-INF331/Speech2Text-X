import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Historial.css';
import SeleccionHistorial from './SeleccionHistorial';

const BASE_URL = 'http://localhost:3000';
const USERNAME = 'alberto';

const Historial = () => {
  const [transcripciones, setTranscripciones] = useState([]);
  const [selectedTranscripcion, setSelectedTranscripcion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const response = await axios.post(`${BASE_URL}/api/audios/historial`, {
          username: USERNAME
        });
        setTranscripciones(response.data.data);
      } catch (err) {
        setError('Error al obtener el historial');
      } finally {
        setLoading(false);
      }
    };
    fetchHistorial();
  }, []);

  return (
    <div className='page-wrapper'>
        <h2>Historial de Transcripciones</h2>
      {loading ? (
        <p>Cargando...</p>
      ) : error ? (
        <p>{error}</p>
      ) : transcripciones.length === 0 ? (
        <p>No hay transcripciones</p>
      ) : (
        <div className="historial-container">
            
          {transcripciones.map((t, index) => (
            <div
              key={index}
              className="transcripcion-card"
              onClick={() => setSelectedTranscripcion(t)}
            >
              <h3>{t.name}</h3>
              <div>{t.transcription}</div>
            </div>
          ))}
        </div>
      )}
      <SeleccionHistorial
        show={selectedTranscripcion !== null}
        onClose={() => setSelectedTranscripcion(null)}
        transcripcion={selectedTranscripcion || {}}
      />
    </div>
  );
};

export default Historial;
