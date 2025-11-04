import React from 'react';
import './Historial.css';
import { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';

const BASE_URL = config.API_URL;

const SeleccionHistorial = ({ show, onClose, transcripcion, onDelete, onUpdateAudio }) => {

  const [isEditing, setIsEditing] = useState(false);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resumen, setResumen] = useState('');
  const [ideas, setIdeas] = useState([]);
  const [extractos, setExtractos] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');


  const handleClose = () => {
    setIsEditing(false);  // salir del modo edición
    setShowDeleteConfirm(false);
    onClose();            // ejecutar la función que te pasaron como prop
  };

  useEffect(() => {
    if (transcripcion?.transcription) {
      setTexto(transcripcion.transcription);
      // Limpiar resultados de IA al cambiar transcripción
      setResumen(transcripcion.resumen || '');
      setIdeas(transcripcion.ideas_principales || []);
      setExtractos(transcripcion.extractos || []);
      setAiError('');
    }
  }, [transcripcion]); // se ejecuta cada vez que cambia transcripcion

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

  const handleGenerarResumen = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const response = await axios.post(`${BASE_URL}/api/audios/${transcripcion.id}/resumen`);
      setResumen(response.data.data.resumen);
      onUpdateAudio(transcripcion.id, { resumen: response.data.data.resumen });
    } catch {
      setAiError('Error al generar resumen');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerarIdeas = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const response = await axios.post(`${BASE_URL}/api/audios/${transcripcion.id}/ideas`);
      setIdeas(response.data.data.ideas);
      onUpdateAudio(transcripcion.id, { ideas_principales: response.data.data.ideas });
    } catch {
      setAiError('Error al generar ideas principales');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerarExtractos = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const response = await axios.post(`${BASE_URL}/api/audios/${transcripcion.id}/extractos`);
      setExtractos(response.data.data.extractos);
      onUpdateAudio(transcripcion.id, { extractos: response.data.data.extractos });
    } catch {
      setAiError('Error al generar extractos');
    } finally {
      setAiLoading(false);
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

        {/* Sección ChatIA */}
        <div style={{ marginTop: '20px', padding: '16px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3 style={{ textAlign: 'center' }}>ChatIA - Análisis Inteligente</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
            <button
              onClick={handleGenerarResumen}
              disabled={aiLoading}
              style={{ padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Generar Resumen
            </button>
            <button
              onClick={handleGenerarIdeas}
              disabled={aiLoading}
              style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Ideas Principales
            </button>
            <button
              onClick={handleGenerarExtractos}
              disabled={aiLoading}
              style={{ padding: '8px 16px', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Extractos
            </button>
          </div>
          {aiLoading && <p style={{ textAlign: 'center' }}>Generando análisis...</p>}
          {aiError && <p style={{ color: 'red', textAlign: 'center' }}>{aiError}</p>}

          {resumen && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ color: 'white' }}>Resumen:</h4>
              <p style={{ backgroundColor: '#555', padding: '8px', borderRadius: '4px', color: 'white', textAlign: 'justify' }}>{resumen}</p>
            </div>
          )}

          {ideas.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ color: 'white' }}>Ideas Principales:</h4>
              <div style={{ backgroundColor: '#555', padding: '8px', borderRadius: '4px', color: 'white' }}>
                {ideas.map((idea, index) => (
                  <p key={index} style={{ textAlign: 'justify', margin: '4px 0' }}>{idea}</p>
                ))}
              </div>
            </div>
          )}

          {extractos.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ color: 'white' }}>Extractos:</h4>
              <ul style={{ backgroundColor: '#555', padding: '8px', borderRadius: '4px', color: 'white' }}>
                {extractos.map((extracto, index) => (
                  <li key={index} style={{ textAlign: 'justify' }}>"{extracto}"</li>
                ))}
              </ul>
            </div>
          )}
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
