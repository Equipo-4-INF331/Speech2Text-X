import React from 'react';
import './Historial.css';
import { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';


const SeleccionHistorial = ({ show, onClose, transcripcion }) => {

  const [isEditing, setIsEditing] = useState(false);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  const handleClose = () => {
    setIsEditing(false);  // salir del modo edición
    onClose();            // ejecutar la función que te pasaron como prop
  };

  useEffect(() => {
    if (transcripcion?.transcription) {
      setTexto(transcripcion.transcription);
    }
  }, [transcripcion]); // se ejecuta cada vez que cambia transcripcion
    if (!show) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.put(`${BASE_URL}/api/audios/updateTranscription`, {
        id: transcripcion.id,
        transcription: texto
      });
      setIsEditing(false); // dejar de editar
    } catch (err) {
      console.log(err)
      setError('Error al actualizar la transcripción');
    } finally {
      setLoading(false);
      setIsEditing(false)
    }
  };


  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="modal-close" onClick={handleClose}>&times;</span>
        <h1 style={{ textAlign: "center" }}>{transcripcion.name}</h1>
        <audio className='audio-container' controls src={transcripcion.audio}></audio>


        <div style={{ marginTop: '16px', textAlign: 'center', position: 'relative' }}>
          {isEditing ? (
            <>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={4}
                style={{ width: '100%', borderRadius: '8px', padding: '8px' }}
              />
              <button
                onClick={handleSave}
                disabled={loading}
                style={{ marginTop: '8px' }}
              >
                Guardar
              </button>
            </>
          ) : (
            <>
              <p
              className='editable-text'

                onClick={() => setIsEditing(true)} // <---- doble click aquí
                style={{ cursor: 'pointer' }}
                title="Doble click para editar"
              >
                {texto}
              </p>
            </>
          )}
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>

      </div>
    </div>
  );
};

export default SeleccionHistorial;
