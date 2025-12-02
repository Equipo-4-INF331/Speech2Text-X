import React, { useRef, useState, useMemo } from 'react';
import axios from 'axios';
import Historial from './Historial.jsx';
import config from '../config';
import { useAudios } from '../context/AudiosContext';
import './MainPage.css';
import { ALLOWED_EMAILS } from '../../../shared/allowedEmails.js';
import { useAuth } from '../context/AuthContext';

const BASE_URL = config.API_URL;

// Hardcoded suggestions (client-side). Ajusta según necesites.
const SUGGESTED_EMAILS = ALLOWED_EMAILS;

const MainPage = () => {
  const { fetchHistorial } = useAudios();
  const { user } = useAuth();
  const audioRef = useRef();
  const [recording, setRecording] = useState();
  const [showUploadCard, setShowUploadCard] = useState(false);
  const [fileNameInput, setFileNameInput] = useState('');
  const [uploadVisibility, setUploadVisibility] = useState('owner');
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [inputText, setInputText] = useState('');

  const suggestions = useMemo(() => {
    const q = inputText.trim().toLowerCase();
    if (!q) return SUGGESTED_EMAILS.filter(e => !selectedEmails.includes(e));
    return SUGGESTED_EMAILS.filter(e => e.toLowerCase().includes(q) && !selectedEmails.includes(e));
  }, [inputText, selectedEmails]);

  const addEmail = (email) => {
    if (!email) return;
    const e = email.trim();
    if (!e || selectedEmails.includes(e) || !ALLOWED_EMAILS.includes(e)) return;
    setSelectedEmails(prev => [...prev, e]);
    setInputText('');
  };

  const removeEmail = (email) => setSelectedEmails(prev => prev.filter(e => e !== email));

  const handleInputKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const email = inputText.replace(',', '').trim();
      if (ALLOWED_EMAILS.includes(email)) {
        addEmail(email);
      }
    } else if (e.key === 'Backspace' && inputText === '' && selectedEmails.length > 0) {
      // remove last
      setSelectedEmails(prev => prev.slice(0, -1));
    }
  };


  const onChangeFile = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setRecording(file);
    setFileNameInput(file.name || '');
    setShowUploadCard(true);
    setSelectedEmails([]);
    setInputText('');
  };

  const uploadFile = async (file, name, visibility = 'owner') => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      if (user?.username) {
        formData.append('username', user.username);
      }

      formData.append('nombre', name || (file && file.name) || 'audio');
      formData.append('visibility', visibility);
      if (visibility === 'private' && selectedEmails.length > 0) formData.append('viewers', selectedEmails.join(','));

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

      setSuccessMessage(`✅ El audio "${name || file?.name || 'audio'}" se subió correctamente.`);
      setTimeout(() => setSuccessMessage(''), 5000);

      setShowUploadCard(false);
      setRecording(null);
      setFileNameInput('');
      setSelectedEmails([]);
      setInputText('');
      if (audioRef.current) audioRef.current.value = '';

      await fetchHistorial();
    } catch (err) {
      console.error('Error subiendo archivo:', err);
      setError('Error al subir el audio');
    } finally {
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

            <div style={{ marginTop: 8 }}>
              <label>Visibilidad:</label>
              <div>
                <label style={{ marginRight: 8 }}>
                  <input type="radio" name="uploadVis" checked={uploadVisibility === 'owner'} onChange={() => setUploadVisibility('owner')} /> Solo yo
                </label>
                <label style={{ marginRight: 8 }}>
                  <input type="radio" name="uploadVis" checked={uploadVisibility === 'private'} onChange={() => setUploadVisibility('private')} /> Privado
                </label>
                <label>
                  <input type="radio" name="uploadVis" checked={uploadVisibility === 'public'} onChange={() => setUploadVisibility('public')} /> Público
                </label>
              </div>
              {uploadVisibility === 'private' && (
                <div style={{ marginTop: 8 }}>
                  <label>Invitados</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                    {selectedEmails.map(e => (
                      <div key={e} style={{ background: '#555', padding: '6px 8px', borderRadius: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: 'white' }}>{e}</span>
                        <button onClick={() => removeEmail(e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white' }}>×</button>
                      </div>
                    ))}
                  </div>
                  <input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleInputKey}
                    placeholder="Añadir email..."
                    style={{ width: '100%', padding: '8px' }}
                  />
                  {inputText && suggestions.length > 0 && (
                    <div style={{ border: '1px solid #ddd', marginTop: 6, borderRadius: 4, maxHeight: 120, overflow: 'auto' }}>
                      {suggestions.slice(0, 5).map(s => (
                        <div key={s} onClick={() => addEmail(s)} style={{ padding: 8, cursor: 'pointer' }}>{s}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 🎧 Reproductor local (antes de subir) */}
            <audio controls src={URL.createObjectURL(recording)} className="audio-preview" />

            <div className="upload-actions">
              <button
                onClick={() => uploadFile(recording, fileNameInput, uploadVisibility)}
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
                  setSelectedEmails([]);
                  setInputText('');
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
