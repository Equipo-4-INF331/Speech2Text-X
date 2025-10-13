import React, { useEffect, useState } from 'react';

const BASE_URL = 'http://localhost:3000';

const MainPage = () => {
    const [audios, setAudios] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Replace with your API endpoint
        fetch('${BASE_URL}/api/audios')
            .then(res => res.json())
            .then(data => {
                setAudios(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Audio List</h1>
            {loading ? (
                <p>Loading...</p>
            ) : audios.length === 0 ? (
                <p>No audios found.</p>
            ) : (
                <ul>
                    {audios.map(audio => (
                        <li key={audio.id} style={{ marginBottom: '1rem' }}>
                            <strong>{audio.title || `Audio ${audio.id}`}</strong>
                            <br />
                            <audio controls src={audio.url} style={{ width: '100%' }} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MainPage;