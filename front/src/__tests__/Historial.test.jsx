import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Historial from '../pages/Historial';
import { useAudios } from '../context/AudiosContext';
import axios from 'axios';

jest.mock('../context/AudiosContext', () => ({
  __esModule: true,
  useAudios: jest.fn(),
}));

// Mock de axios y config
jest.mock('axios');
jest.mock('../config', () => ({
  default: {
    API_URL: 'http://localhost:3000',
  },
}));

const mockTranscripciones = [
  {
    id: 1,
    name: 'Audio Test 1',
    transcription: 'Esta es una transcripción de prueba',
    created_at: '2025-10-15T10:00:00Z',
    audio: 'https://example.com/audio1.mp3'
  },
  {
    id: 2,
    name: 'Audio Test 2',
    transcription: 'Otra transcripción de prueba',
    created_at: '2025-10-14T10:00:00Z',
    audio: 'https://example.com/audio2.mp3'
  }
];

describe('Historial - Listar audios', () => {
  const mockFetchHistorial = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAudios.mockReturnValue({
      transcripciones: [],
      loading: false,
      error: null,
      fetchHistorial: mockFetchHistorial,
      setTranscripciones: jest.fn(),
    });
  });

  test('debe renderizar el componente sin errores', async () => {
    axios.get.mockResolvedValueOnce({ data: { data: [] } });
    
    render(<Historial />);
    
    expect(screen.getByText(/Historial/i)).toBeInTheDocument();
    
    // Esperar a que termine la carga
    await waitFor(() => {
      expect(mockFetchHistorial).toHaveBeenCalled();
    });
  });

  test('debe cargar y mostrar lista de audios', async () => {
    useAudios.mockReturnValueOnce({
      transcripciones: mockTranscripciones,
      loading: false,
      error: null,
      fetchHistorial: mockFetchHistorial,
      setTranscripciones: jest.fn(),
    });
    
    render(<Historial />);
    
    await waitFor(() => {
      expect(screen.getByText('Audio Test 1')).toBeInTheDocument();
      expect(screen.getByText('Audio Test 2')).toBeInTheDocument();
    });
  });

  test('debe mostrar mensaje de error si falla la carga', async () => {
    useAudios.mockReturnValueOnce({
      transcripciones: [],
      loading: false,
      error: 'Error al obtener el historial',
      fetchHistorial: mockFetchHistorial,
      setTranscripciones: jest.fn(),
    });
    
    render(<Historial />);
    
    await waitFor(() => {
      expect(screen.getByText(/Error al obtener el historial/i)).toBeInTheDocument();
    });
  });

  test('debe mostrar mensaje cuando no hay transcripciones', async () => {
    
    render(<Historial />);
    
    await waitFor(() => {
      expect(screen.getByText(/No hay transcripciones/i)).toBeInTheDocument();
    });
  });
});

describe('Historial - Filtrar por características', () => {
  const mockFetchHistorial = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAudios.mockReturnValue({
      transcripciones: [],
      loading: false,
      error: null,
      fetchHistorial: mockFetchHistorial,
    });
  });

  test('debe renderizar los inputs de filtro', async () => {
    render(<Historial />);
    expect(screen.getByPlaceholderText(/Filtrar por nombre/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Filtrar por descripción/i)).toBeInTheDocument();
  });

  test('debe permitir filtrar por nombre', async () => {
    render(<Historial />);
    const nameInput = screen.getByPlaceholderText(/Filtrar por nombre/i);
    fireEvent.change(nameInput, { target: { value: 'Test' } });
    expect(nameInput.value).toBe('Test');
  });

  test('debe aplicar filtros al hacer clic en Filtrar', async () => {
    render(<Historial />);

    const nameInput =
      screen.getByPlaceholderText(/Filtrar por nombre/i);
    fireEvent.change(nameInput, {
      target: { value: 'Audio Test 1' },
    });

    const descriptionInput =
      screen.getByPlaceholderText(/Filtrar por descripción/i);
    fireEvent.change(descriptionInput, {
      target: { value: 'prueba' },
    });

    const filterButton = screen.getByText(/Filtrar/i);
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(mockFetchHistorial).toHaveBeenCalledTimes(2);
      expect(mockFetchHistorial).toHaveBeenLastCalledWith({
        name: 'Audio Test 1',
        description: 'prueba',
      });
    });
  });

  test('debe limpiar filtros al hacer clic en Limpiar', () => {
    render(<Historial />);

    const nameInput = screen.getByPlaceholderText(/Filtrar por nombre/i);
    fireEvent.change(nameInput, { target: { value: 'Test' } });

    const clearButton = screen.getByText(/Limpiar/i);
    fireEvent.click(clearButton);

    expect(nameInput.value).toBe('');
  });

  test('debe validar que fecha desde no sea mayor a fecha hasta', async () => {
    render(<Historial />);
    
    // Esperar a que termine la carga inicial - cuando aparezca "No hay transcripciones"
    await waitFor(() => {
      expect(screen.getByText(/No hay transcripciones/i)).toBeInTheDocument();
    });
    
    // Buscar inputs por tipo
    const dateInputs = screen.getAllByDisplayValue('');
    const dateFromInput = dateInputs.find(input => input.type === 'date' && input.previousElementSibling?.textContent === 'Fecha desde:');
    const dateToInput = dateInputs.find(input => input.type === 'date' && input.previousElementSibling?.textContent === 'Fecha hasta:');
    
    // Cambiar fechas y esperar actualizaciones
    fireEvent.change(dateFromInput, { target: { value: '2025-10-15' } });
    fireEvent.change(dateToInput, { target: { value: '2025-10-10' } });
    
    await waitFor(() => {
      expect(screen.getByText(/fecha hasta no puede ser anterior/i)).toBeInTheDocument();
    });
  });
});
