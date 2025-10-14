import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

const MainPage = () => {
    const [audios, setAudios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAudios = async () => {
            try {
                const response = await axios.get(`${BASE_URL}/api/audios`); // Ajusta la ruta según tu backend
                setAudios(response.data.data);
            } catch (err) {
                setError('Error al cargar los audios');
            } finally {
                setLoading(false);
            }
        };
        fetchAudios();
    }, []);

    if (loading) return <div>Cargando audios...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div>
            <h1>Lista de Audios</h1>
            {audios.length === 0 ? (
                <p>No hay audios disponibles.</p>
            ) : (
                <ul>
                    {audios.map(audio => (
                        <li key={audio.id}>
                            <strong>{audio.name}</strong>
                            <audio controls src={audio.url} style={{ marginLeft: '10px' }} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MainPage;