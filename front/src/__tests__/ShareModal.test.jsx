import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import ShareModal from '../components/ShareModal';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock config
jest.mock('../config', () => ({
  API_URL: 'http://localhost:3000/api'
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-token')
}));

// Mock ALLOWED_EMAILS
jest.mock('../../../shared/allowedEmails.js', () => ({
  ALLOWED_EMAILS: ['test@example.com', 'user@example.com', 'new@example.com']
}));

// Mock window.location
// delete window.location;
// Object.defineProperty(window, 'location', {
//   value: { origin: 'http://localhost:5173' },
//   configurable: true,
// });

describe('ShareModal', () => {
  beforeEach(() => {
    // Mock window.__PUBLIC_ORIGIN__
    window.__PUBLIC_ORIGIN__ = 'http://localhost:5173';
  });
  const defaultProps = {
    audioId: 1,
    initialToken: null,
    initialPublic: false,
    onClose: jest.fn(),
    visible: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería renderizar modal cuando visible es true', () => {
    render(<ShareModal {...defaultProps} />);
    expect(screen.getByText('Compartir transcripción')).toBeInTheDocument();
    expect(screen.getByText('Solo yo')).toBeInTheDocument();
    expect(screen.getByText('Privado (invitar por email)')).toBeInTheDocument();
    expect(screen.getByText('Público (cualquiera con el link)')).toBeInTheDocument();
  });

  it('debería no renderizar cuando visible es false', () => {
    render(<ShareModal {...defaultProps} visible={false} />);
    expect(screen.queryByText('Compartir transcripción')).not.toBeInTheDocument();
  });

  it('debería cambiar visibilidad a público y generar token', () => {
    render(<ShareModal {...defaultProps} />);
    
    const publicRadio = screen.getByRole('radio', { name: 'Público (cualquiera con el link)' });
    fireEvent.click(publicRadio);
    
    expect(screen.getByDisplayValue('http://localhost:5173/share/mock-uuid-token')).toBeInTheDocument();
  });

  it('debería cambiar visibilidad a privado y mostrar input de emails', () => {
    render(<ShareModal {...defaultProps} />);
    
    const privateRadio = screen.getByRole('radio', { name: 'Privado (invitar por email)' });
    fireEvent.click(privateRadio);
    
    expect(screen.getByText('Invitados')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Añadir email...')).toBeInTheDocument();
  });

  it('debería agregar email al presionar Enter', () => {
    render(<ShareModal {...defaultProps} />);
    
    const privateRadio = screen.getByRole('radio', { name: 'Privado (invitar por email)' });
    fireEvent.click(privateRadio);
    
    const input = screen.getByPlaceholderText('Añadir email...');
    fireEvent.change(input, { target: { value: 'new@example.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(screen.getByText('new@example.com')).toBeInTheDocument();
  });

  it('debería agregar email desde sugerencias', () => {
    render(<ShareModal {...defaultProps} />);
    
    const privateRadio = screen.getByRole('radio', { name: 'Privado (invitar por email)' });
    fireEvent.click(privateRadio);
    
    const input = screen.getByPlaceholderText('Añadir email...');
    fireEvent.change(input, { target: { value: 'test' } });
    
    const suggestion = screen.getByText('test@example.com');
    fireEvent.click(suggestion);
    
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('debería remover email al hacer click en ×', () => {
    render(<ShareModal {...defaultProps} />);
    
    const privateRadio = screen.getByRole('radio', { name: 'Privado (invitar por email)' });
    fireEvent.click(privateRadio);
    
    const input = screen.getByPlaceholderText('Añadir email...');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    
    const removeButton = screen.getByText('×');
    fireEvent.click(removeButton);
    
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
  });

  it('debería guardar cambios exitosamente', async () => {
    mockedAxios.put.mockResolvedValueOnce({
      data: { data: { visibility: 'public', token: 'mock-uuid-token' } }
    });

    render(<ShareModal {...defaultProps} />);
    
    const publicRadio = screen.getByRole('radio', { name: 'Público (cualquiera con el link)' });
    fireEvent.click(publicRadio);
    
    const saveButton = screen.getByText('Guardar');
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith(
        'http://localhost:3000/api/api/audios/1/visibility',
        { visibility: 'public', token: 'mock-uuid-token' }
      );
    });
    
    expect(screen.getByText('Cambios guardados')).toBeInTheDocument();
  });

  it('debería mostrar error al guardar', async () => {
    mockedAxios.put.mockRejectedValueOnce({
      response: { data: { error: 'Error guardando' } }
    });

    render(<ShareModal {...defaultProps} />);
    
    const privateRadio = screen.getByRole('radio', { name: 'Privado (invitar por email)' });
    fireEvent.click(privateRadio);
    
    const saveButton = screen.getByText('Guardar');
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Error guardando')).toBeInTheDocument();
    });
  });

  it('debería deshabilitar botón guardar cuando no hay cambios pendientes', () => {
    render(<ShareModal {...defaultProps} />);
    
    const saveButton = screen.getByText('Guardar');
    expect(saveButton).toBeDisabled();
  });

  it('debería habilitar botón guardar cuando hay cambios', async () => {
    render(<ShareModal {...defaultProps} />);
    
    const publicRadio = screen.getByRole('radio', { name: 'Público (cualquiera con el link)' });
    fireEvent.click(publicRadio);
    
    const saveButton = screen.getByText('Guardar');
    await waitFor(() => expect(saveButton).not.toBeDisabled());
  });

  it('debería llamar onClose al cancelar', () => {
    const mockOnClose = jest.fn();
    render(<ShareModal {...defaultProps} onClose={mockOnClose} />);
    
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('debería resetear estado al cambiar props', () => {
    const { rerender } = render(<ShareModal {...defaultProps} />);
    
    const privateRadio = screen.getByRole('radio', { name: 'Privado (invitar por email)' });
    fireEvent.click(privateRadio);
    
    expect(screen.getByText('Invitados')).toBeInTheDocument();
    
    rerender(<ShareModal {...defaultProps} visible={false} />);
    
    rerender(<ShareModal {...defaultProps} visible={true} />);
    
    // Should reset to initial state
    expect(screen.queryByText('Invitados')).not.toBeInTheDocument();
  });
});