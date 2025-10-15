import React from 'react';
import './Historial.css';

const SeleccionHistorial = ({ show, onClose, transcripcion }) => {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="modal-close" onClick={onClose}>&times;</span>
        <h1 style={{ textAlign: "center" }}>{transcripcion.name}</h1>
        <audio className='audio-container' controls src={transcripcion.audio}></audio>
        <p style={{ marginTop: '16px' }}>{transcripcion.transcription}</p>
      </div>
    </div>
  );
};

export default SeleccionHistorial;
