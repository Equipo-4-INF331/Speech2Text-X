import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import config from '../config';

const BASE_URL = config.API_URL;

const safeJsonParse = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return [];
    }
  }
  return [];
};

const ShareView = () => {
  const { token } = useParams();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const viewerToken = query.get('viewerToken') || null;

  const [audio, setAudio] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await axios.get(`${BASE_URL}/api/audios/share/${token}${viewerToken ? `?viewerToken=${viewerToken}` : ''}`);
        if (resp.data && resp.data.data) {
          setAudio({
            ...resp.data.data,
            ideas_principales: safeJsonParse(resp.data.data.ideas_principales),
            extractos: safeJsonParse(resp.data.data.extractos)
          });
          if (resp.data.viewer) setViewer(resp.data.viewer);
        } else {
          setError('No se encontró la transcripción');
        }
      } catch (e) {
        console.error(e);
        setError(e?.response?.data?.error || 'Error cargando recurso compartido');
      }
    };
    load();
  }, [token, viewerToken]);

  if (error) return <div style={{ padding: 24 }}><h2>{error}</h2></div>;
  if (!audio) return <div style={{ padding: 24 }}><h2>Cargando...</h2></div>;

  return (
    <div style={{ maxWidth: 800, margin: '24px auto', padding: 16 }}>
      <h2>{audio.name}</h2>
      <audio className='audio-container' controls src={audio.url || audio.audio}></audio>

      <h3 style={{ marginTop: 16 }}>Transcripción</h3>
      <pre style={{ whiteSpace: 'pre-wrap', background: 'var(--color-card-bg)', padding: 12, borderRadius: 6, color: 'var(--color-card-text)' }}>{audio.transcription}</pre>

      {(audio.resumen || (audio.ideas_principales && audio.ideas_principales.length) || (audio.extractos && audio.extractos.length)) && (
        <div style={{ marginTop: 16, background: 'var(--color-modal-bg)', padding: 16, borderRadius: 8, color: 'var(--color-card-text)' }}>
          {audio.resumen && (
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ margin: 0, color: 'white' }}>Resumen</h4>
              <p style={{ backgroundColor: '#444', padding: 12, borderRadius: 6, color: 'white', textAlign: 'justify', marginTop: 8 }}>{audio.resumen}</p>
            </div>
          )}

          {audio.ideas_principales && audio.ideas_principales.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ margin: 0, color: 'white' }}>Ideas principales</h4>
              <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                {audio.ideas_principales.map((it, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>{it}</li>
                ))}
              </ul>
            </div>
          )}

          {audio.extractos && audio.extractos.length > 0 && (
            <div>
              <h4 style={{ margin: 0, color: 'white' }}>Extractos</h4>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {audio.extractos.map((it, i) => (
                  <blockquote key={i} style={{ margin: 0, background: '#333', padding: 12, borderRadius: 6, color: 'white', borderLeft: '4px solid #666' }}>{it}</blockquote>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {viewer && <p style={{ color: 'green', marginTop: 12 }}>Accediendo como: {viewer.email}</p>}
    </div>
  );
};

export default ShareView;
