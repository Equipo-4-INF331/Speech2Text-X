import React, { useRef, useState } from 'react';
import axios from 'axios';
import Historial from './Historial.jsx';
import config from '../config';
import { useAudios } from '../context/AudiosContext';
import './MainPage.css';

const BASE_URL = config.API_URL;

const MainPage = () => {
  const { fetchHistorial } = useAudios();
  
  const audioRef = useRef();
  const [recording, setRecording] = useState();
  const [showUploadCard, setShowUploadCard] = useState(false);
  const [fileNameInput, setFileNameInput] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
const [loading, setLoading] = useState(false);


  const onChangeFile = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setRecording(file);
    setFileNameInput(file.name || '');
    setShowUploadCard(true);
  };

  const uploadFile = async (file, name) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('nombre', name || file.name);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('No hay sesión activa. Vuelve a iniciar sesión.');
        return;
      }

      await axios.post(`${BASE_URL}/api/audios`, formData, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccessMessage(`✅ El audio "${name}" se subió correctamente.`);
      setTimeout(() => setSuccessMessage(''), 5000);

      setShowUploadCard(false);
      setRecording(null);
      setFileNameInput('');

      await fetchHistorial();
    } catch (err) {
      console.error('Error subiendo archivo:', err);
      setError('Error al subir el audio');
    } finally{
      setLoading(false); 
    }
  };

  return (
    <div className="main-container">
      <Historial />

      <div className="main-content">
        {successMessage && (
          <div className="message success">{successMessage}</div>
        )}

        {error && <div className="message error">{error}</div>}

        <h1 className="main-title">Speech2Text X</h1>
        <div className="main-subtitle">
          Sube un audio para conocer su contenido.
        </div>

        <input
          type="file"
          accept="audio/*"
          ref={audioRef}
          onChange={onChangeFile}
          id="hidden-audio-input"
          className="hidden-input"
        />

        <button
          onClick={() => document.getElementById('hidden-audio-input').click()}
          className="upload-button"
        >
          +
        </button>

        {showUploadCard && recording && (
          <div className="upload-card">
            <label className="upload-label">Nombre del audio</label>
            <input
              type="text"
              value={fileNameInput}
              onChange={(e) => setFileNameInput(e.target.value)}
              className="upload-input"
            />

            {/* 🎧 Reproductor local (antes de subir) */}
            <audio controls src={URL.createObjectURL(recording)} className="audio-preview" />

            <div className="upload-actions">
              <button
                onClick={() => uploadFile(recording, fileNameInput)}
                className="btn primary"
                disabled={loading}
              >
                {loading ? <div className="spinner"></div> : 'Subir'}
              </button>
              <button
                onClick={() => {
                  setShowUploadCard(false);
                  setRecording(null);
                  setFileNameInput('');
                }}
                className="btn secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MainPage;
