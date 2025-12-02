import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import ShareView from '../pages/ShareView';
import { MemoryRouter, Route } from 'react-router-dom';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock config
jest.mock('../config', () => ({
  API_URL: 'http://localhost:3000/api'
}));

// Mock react-router-dom
const mockUseParams = jest.fn();
const mockUseLocation = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockUseParams(),
  useLocation: () => mockUseLocation(),
}));

describe('ShareView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería mostrar loading inicialmente', () => {
    mockUseParams.mockReturnValue({ token: 'test-token' });
    mockUseLocation.mockReturnValue({ search: '' });

    render(
      <MemoryRouter>
        <ShareView />
      </MemoryRouter>
    );

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('debería cargar y mostrar audio público exitosamente', async () => {
    mockUseParams.mockReturnValue({ token: 'test-token' });
    mockUseLocation.mockReturnValue({ search: '' });

    const mockData = {
      id: 1,
      name: 'Test Audio',
      audio: 'http://example.com/audio.mp3',
      url: 'http://example.com/signed.mp3',
      transcription: 'Test transcription',
      resumen: 'Test summary',
      ideas_principales: '["Idea 1", "Idea 2"]',
      extractos: '["Extract 1", "Extract 2"]'
    };

    mockedAxios.get.mockResolvedValueOnce({
      data: { data: mockData }
    });

    render(
      <MemoryRouter>
        <ShareView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Audio')).toBeInTheDocument();
    });

    expect(screen.getByText('Test transcription')).toBeInTheDocument();
    expect(screen.getByText('Test summary')).toBeInTheDocument();
    expect(screen.getByText('Idea 1')).toBeInTheDocument();
    expect(screen.getByText('Extract 1')).toBeInTheDocument();
  });

  it('debería mostrar error si falla la carga', async () => {
    mockUseParams.mockReturnValue({ token: 'invalid-token' });
    mockUseLocation.mockReturnValue({ search: '' });

    mockedAxios.get.mockRejectedValueOnce({
      response: { data: { error: 'Link no válido' } }
    });

    render(
      <MemoryRouter>
        <ShareView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Link no válido')).toBeInTheDocument();
    });
  });

  it('debería mostrar viewer info si es privado', async () => {
    mockUseParams.mockReturnValue({ token: 'test-token' });
    mockUseLocation.mockReturnValue({ search: '?viewerToken=viewer-123' });

    const mockData = {
      id: 1,
      name: 'Private Audio',
      audio: 'http://example.com/audio.mp3',
      transcription: 'Private transcription'
    };

    mockedAxios.get.mockResolvedValueOnce({
      data: {
        data: mockData,
        viewer: { email: 'viewer@example.com', verified: true }
      }
    });

    render(
      <MemoryRouter>
        <ShareView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Accediendo como: viewer@example.com')).toBeInTheDocument();
    });
  });

  it('debería parsear JSON de ideas_principales y extractos', async () => {
    mockUseParams.mockReturnValue({ token: 'test-token' });
    mockUseLocation.mockReturnValue({ search: '' });

    const mockData = {
      id: 1,
      name: 'Test Audio',
      audio: 'http://example.com/audio.mp3',
      transcription: 'Test transcription',
      ideas_principales: '["Idea 1", "Idea 2"]',
      extractos: '["Extract 1", "Extract 2"]'
    };

    mockedAxios.get.mockResolvedValueOnce({
      data: { data: mockData }
    });

    render(
      <MemoryRouter>
        <ShareView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Idea 1')).toBeInTheDocument();
      expect(screen.getByText('Idea 2')).toBeInTheDocument();
      expect(screen.getByText('Extract 1')).toBeInTheDocument();
      expect(screen.getByText('Extract 2')).toBeInTheDocument();
    });
  });

  it('debería manejar ideas_principales como array', async () => {
    mockUseParams.mockReturnValue({ token: 'test-token' });
    mockUseLocation.mockReturnValue({ search: '' });

    const mockData = {
      id: 1,
      name: 'Test Audio',
      audio: 'http://example.com/audio.mp3',
      transcription: 'Test transcription',
      ideas_principales: ['Idea 1', 'Idea 2']
    };

    mockedAxios.get.mockResolvedValueOnce({
      data: { data: mockData }
    });

    render(
      <MemoryRouter>
        <ShareView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Idea 1')).toBeInTheDocument();
      expect(screen.getByText('Idea 2')).toBeInTheDocument();
    });
  });
});