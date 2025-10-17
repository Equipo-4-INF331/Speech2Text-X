import React, { useRef, useState } from 'react';
import axios from 'axios';
import Historial from './Historial.jsx';
import config from '../config';

const BASE_URL = config.API_URL;

const MainPage = () => {
  const audioRef = useRef();
  const historialRef = useRef(); // ref al historial
  const [recording, setRecording] = useState();
  const [showUploadCard, setShowUploadCard] = useState(false);
  const [fileNameInput, setFileNameInput] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const onChangeFile = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setRecording(file);
    setFileNameInput(file.name || '');
    setShowUploadCard(true);
  };

  const uploadFile = async (file, name) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('username', 'alberto'); // mismo usuario que historial
      formData.append('nombre', name || file.name);

      await axios.post(`${BASE_URL}/api/audios`, formData);

      setSuccessMessage(`✅ El audio "${name}" se subió correctamente.`);
      setTimeout(() => setSuccessMessage(''), 5000);

      // Reset UI
      setShowUploadCard(false);
      setRecording(null);
      setFileNameInput('');
      audioRef.current.value = '';

      // 🔄 Actualizar historial
      historialRef.current?.refresh();

    } catch (err) {
      console.error('Error subiendo archivo:', err);
      setError('Error al subir el audio');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar Historial */}
      <Historial ref={historialRef} />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col items-center justify-center p-10">
        {/* Mensaje de éxito */}
        {successMessage && (
          <div className="fixed top-10 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            {successMessage}
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            {error}
          </div>
        )}

        <h1 className="text-5xl font-bold text-center">Speech2Text X</h1>
        <div className="text-xl p-2 text-center">
          Sube un audio para conocer su contenido.
        </div>

        <input
          type="file"
          accept="audio/*"
          ref={audioRef}
          onChange={onChangeFile}
          style={{ display: 'none' }}
          id="hidden-audio-input"
        />

        <button
          onClick={() => document.getElementById('hidden-audio-input').click()}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-600 text-white text-6xl my-4"
        >
          +
        </button>

        {showUploadCard && recording && (
          <div className="mt-4 p-4 border rounded shadow-sm w-full max-w-md bg-white">
            <label className="block text-sm font-medium text-gray-700">
              Nombre del audio
            </label>
            <input
              type="text"
              value={fileNameInput}
              onChange={(e) => setFileNameInput(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 bg-slate-200 px-2"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => uploadFile(recording, fileNameInput)}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Subir
              </button>
              <button
                onClick={() => {
                  setShowUploadCard(false);
                  setRecording(null);
                  setFileNameInput('');
                }}
                className="px-4 py-2 bg-gray-200 rounded"
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
