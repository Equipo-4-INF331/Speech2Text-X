import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import config from '../config';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = config.API_URL;

const ShareModal = ({ audioId, initialToken, initialPublic, onClose, visible }) => {
  const [visibility, setVisibility] = useState(initialPublic ? 'public' : 'owner');
  const [token, setToken] = useState(initialToken || null);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [pendingChanges, setPendingChanges] = useState(false);

  const inputRef = useRef(null);
  const initialVisibility = useRef('owner');

  useEffect(() => {
    const initVis = initialPublic ? 'public' : 'owner';
    initialVisibility.current = initVis;
    setVisibility(initVis);
    setToken(initialToken || null);
    setSelectedEmails([]);
    setInputText('');
    setStatus('idle');
    setError(null);
    setPendingChanges(false);
  }, [initialPublic, initialToken, visible]);

  useEffect(() => {
    const hasChanges = visibility !== initialVisibility.current || (visibility === 'private' && selectedEmails.length > 0);
    setPendingChanges(hasChanges);
  }, [visibility, selectedEmails]);

  useEffect(() => {
    if (visibility === 'public' || visibility === 'private') {
      if (!token) {
        const newToken = uuidv4();
        setToken(newToken);
      }
    } else {
      setToken(null);
    }
  }, [visibility, token]);

  const origin = window.__PUBLIC_ORIGIN__ || window.location.origin;
  const link = token ? `${origin}/share/${token}` : '';

  const addEmail = (email) => {
    if (!email) return;
    const e = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!e || selectedEmails.includes(e) || !emailRegex.test(e)) return;
    setSelectedEmails(prev => [...prev, e]);
    setInputText('');
    if (inputRef.current) inputRef.current.focus();
  };

  const removeEmail = (email) => setSelectedEmails(prev => prev.filter(e => e !== email));

  const handleInputKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const email = inputText.replace(',', '').trim();
      addEmail(email);
    } else if (e.key === 'Backspace' && inputText === '' && selectedEmails.length > 0) {
      // remove last
      setSelectedEmails(prev => prev.slice(0, -1));
    }
  };

  const handleSave = async () => {
    setError(null);
    setStatus('saving');
    try {
      // 1) update visibility, send token if generated
      const payload = { visibility };
      if (token && (visibility === 'public' || visibility === 'private')) {
        payload.token = token;
      }
      const visResp = await axios.put(`${BASE_URL}/api/audios/${audioId}/visibility`, payload);
      const data = visResp.data.data || visResp.data;
      setVisibility(data.visibility || visibility);
      setToken(data.token || token);

      // 2) if private and has selected emails, invite them
      if (visibility === 'private' && selectedEmails.length > 0) {
        const inviteResp = await axios.post(`${BASE_URL}/api/audios/${audioId}/invite`, { emails: selectedEmails });
        const { results } = inviteResp.data;
        const failed = results.filter(r => !r.ok);
        if (failed.length > 0) {
          const failedMsgs = failed.map(f => `${f.email}: ${f.reason}`).join('; ');
          setError(`Errores enviando invitaciones: ${failedMsgs}`);
          setStatus('error');
          return; // no continuar
        }
      }

      setStatus('saved');
      setPendingChanges(false);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || 'Error guardando cambios');
      setStatus('error');
    }
  };

  const handleCancel = () => {
    // reset to initial
    setVisibility(initialPublic ? 'public' : 'owner');
    setToken(initialToken || null);
    setSelectedEmails([]);
    setInputText('');
    setPendingChanges(false);
    setError(null);
    onClose && onClose();
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleCancel} style={{ float: 'right' }}>Cerrar</button>
        <h2>Compartir transcripción</h2>

        <div style={{ margin: '12px 0' }}>
          <label>Visibilidad</label>
          <div>
            <label style={{ marginRight: 8 }}>
              <input type="radio" name="vis" checked={visibility === 'owner'} onChange={() => setVisibility('owner')} /> Solo yo
            </label>
            <label style={{ marginRight: 8 }}>
              <input type="radio" name="vis" checked={visibility === 'private'} onChange={() => setVisibility('private')} /> Privado (invitar por email)
            </label>
            <label>
              <input type="radio" name="vis" checked={visibility === 'public'} onChange={() => setVisibility('public')} /> Público (cualquiera con el link)
            </label>
            {status === 'saving' && <span style={{ marginLeft: 8 }}>Guardando...</span>}
          </div>
        </div>

        {visibility === 'public' && (
          <div style={{ margin: '12px 0' }}>
            <label>Link público</label>
            <input readOnly value={link} style={{ width: '100%' }} />
          </div>
        )}

        {visibility === 'private' && (
          <div style={{ marginTop: 12 }}>
            <label>Invitados</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                  {selectedEmails.map(e => (
                    <div key={e} style={{ background: '#555', padding: '6px 8px', borderRadius: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, color: 'white' }}>{e}</span>
                      <button onClick={() => removeEmail(e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white' }}>×</button>
                    </div>
                  ))}
                </div>
                <input
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleInputKey}
                  placeholder="Añadir email..."
                  style={{ width: '100%', padding: '8px' }}
                />
              </div>
            </div>
          </div>
        )}

        {status === 'saved' && <p style={{ color: 'green' }}>Cambios guardados</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={handleCancel} className="btn secondary">Cancelar</button>
          <button onClick={handleSave} className="btn primary" disabled={!pendingChanges || status === 'saving'}>{status === 'saving' ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
