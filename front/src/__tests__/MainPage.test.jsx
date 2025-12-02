import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import MainPage from '../pages/MainPage';
import { useAudios } from '../context/AudiosContext';

jest.mock('../context/AudiosContext', () => ({
  __esModule: true,
  useAudios: jest.fn(),
}));

jest.mock('../context/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({
    user: { id: 1, username: 'pepe' },
    token: 'fake-token',
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Mock de axios y config
jest.mock('axios');
jest.mock('../config', () => ({
  default: {
    API_URL: 'http://localhost:3000',
  },
}));

describe('MainPage - Agregar nuevo audio', () => {
  const mockFetchHistorial = jest.fn(async () => {
    await axios.get('/audios/historial');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'fake-token');  // 👈 para que pase el if (!token)
    
    axios.get.mockResolvedValue({ data: { data: [] } });
    useAudios.mockReturnValue({
      fetchHistorial: mockFetchHistorial,
      audios: [],
      transcripciones: [],
      setAudios: jest.fn(),
      setTranscripciones: jest.fn(),
      loading: false,
      error: null,
    });
  });

  test('debe renderizar el componente principal', async () => {
    render(<MainPage />);
    
    expect(screen.getByText(/Speech2Text X/i)).toBeInTheDocument();
    expect(screen.getByText(/Sube un audio/i)).toBeInTheDocument();
    
    // Esperar a que termine la carga del historial
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
  });

  test('debe mostrar card de upload cuando se selecciona un archivo', async () => {
    render(<MainPage />);
    
    // Esperar a que termine la carga inicial
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
    
    const fileInput = document.getElementById('hidden-audio-input');
    const file = new File(['audio content'], 'test-audio.mp3', { type: 'audio/mp3' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(screen.getByText(/Subir/i)).toBeInTheDocument();
  });

  test('debe permitir cambiar el nombre del archivo', async () => {
    render(<MainPage />);
    
    // Esperar a que termine la carga inicial
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
    
    const fileInput = document.getElementById('hidden-audio-input');
    const file = new File(['audio content'], 'test-audio.mp3', { type: 'audio/mp3' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Buscar el input de texto dentro del card de upload
    const nameInput = screen.getByDisplayValue('test-audio.mp3');
    fireEvent.change(nameInput, { target: { value: 'Mi Audio Custom' } });
    
    expect(nameInput.value).toBe('Mi Audio Custom');
  });

  test('debe subir el audio exitosamente', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    
    render(<MainPage />);
    
    const fileInput = document.getElementById('hidden-audio-input');
    const file = new File(['audio content'], 'test-audio.mp3', { type: 'audio/mp3' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    const uploadButton = screen.getByText(/Subir/i);
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
      expect(screen.getByText(/se subió correctamente/i)).toBeInTheDocument();
    });
  });

  test('debe mostrar error si falla la subida', async () => {
    axios.post.mockRejectedValueOnce(new Error('Upload failed'));
    
    render(<MainPage />);
    
    const fileInput = document.getElementById('hidden-audio-input');
    const file = new File(['audio content'], 'test-audio.mp3', { type: 'audio/mp3' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    const uploadButton = screen.getByText(/Subir/i);
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Error al subir el audio/i)).toBeInTheDocument();
    });
  });

  test('debe permitir cancelar la subida', async () => {
    render(<MainPage />);
    
    // Esperar a que termine la carga inicial
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
    
    const fileInput = document.getElementById('hidden-audio-input');
    const file = new File(['audio content'], 'test-audio.mp3', { type: 'audio/mp3' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(screen.getByText(/Subir/i)).toBeInTheDocument();
    
    const cancelButton = screen.getByText(/Cancelar/i);
    fireEvent.click(cancelButton);
    
    expect(screen.queryByText(/Subir/i)).not.toBeInTheDocument();
  });
});
