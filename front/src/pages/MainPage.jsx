import React, { useRef, useEffect, useState } from 'react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const MainPage = () => {
    const audioRef = useRef();
    const [recording, setRecording] = useState();
    const [response, setResponse] = useState(null);
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
            formData.append('username', 'testuser');
            formData.append('name', name || file.name);

            const res = await axios.post(`${BASE_URL}/api/audios`, formData);
            setResponse(res.data?.data ?? null);
            
            setSuccessMessage(`✅ El audio "${name}" se subió correctamente.\nYa puedes revisar su transcripción.`);
            setTimeout(() => setSuccessMessage(''), 5000); // se borra a los 5s

            // reset UI
            setShowUploadCard(false);
            setRecording(null);
            setFileNameInput('');
            audioRef.current.value = '';
        } catch (err) {
            console.error('Error subiendo archivo al backend:', err);
            setError('Error al subir el audio');
        }
    };

    return (
        <div className="relative">
            {successMessage && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
                    {successMessage}
                </div>
            )}
            <div className='p-10'>
                <h1 className='text-5xl font-bold'>Speech2Text X</h1>
                <div className='text-xl p-2'>Sube un audio para conocer su contenido.</div>
            </div>            
            <div>
                <div>
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
                        className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-600 text-white text-6xl my-2"
                        aria-label="Subir audio"
                    >
                        +
                    </button>

                    {showUploadCard && recording && (
                        <div className="justify-self-center mt-4 p-4 m-4 border rounded shadow-sm w-full max-w-md bg-white fw">
                            <label className="block text-sm font-medium text-gray-700">Nombre del audio</label>
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
                                    onClick={() => { setShowUploadCard(false); setRecording(null); setFileNameInput(''); }}
                                    className="px-4 py-2 bg-gray-200 rounded"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MainPage;