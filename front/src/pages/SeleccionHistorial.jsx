import React from 'react';
import './Historial.css';
import { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';

const BASE_URL = config.API_URL;

const SeleccionHistorial = ({ show, onClose, transcripcion, onDelete }) => {

  const [isEditing, setIsEditing] = useState(false);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);


  const handleClose = () => {
    setIsEditing(false);  // salir del modo edición
    setShowDeleteConfirm(false);
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

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    
    setLoading(true);
    try {
      await axios.delete(`${BASE_URL}/api/audios/${transcripcion.id}`);
      setShowDeleteConfirm(false);
      onDelete(); // Llamar callback para refrescar lista
      handleClose();
    } catch (err) {
      console.log(err);
      setError('Error al eliminar el audio');
    } finally {
      setLoading(false);
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

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          {showDeleteConfirm ? (
            <>
              <p style={{ color: 'red', marginBottom: '8px' }}>
                ¿Estás seguro de que deseas eliminar este audio?
              </p>
              <button
                onClick={handleDelete}
                disabled={loading}
                style={{ 
                  marginRight: '8px',
                  backgroundColor: '#d32f2f',
                  color: 'white',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Sí, eliminar
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ 
                  padding: '8px 16px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              onClick={handleDelete}
              disabled={loading}
              style={{ 
                backgroundColor: '#f44336',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Eliminar audio
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default SeleccionHistorial;
