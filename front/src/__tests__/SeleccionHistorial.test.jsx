import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import SeleccionHistorial from '../pages/SeleccionHistorial';

jest.mock('axios');
jest.mock('../config', () => ({
  default: {
    API_URL: 'http://localhost:3000',
  },
}));

const mockAudio = {
  id: 1,
  name: 'Test Audio',
  transcription: 'Esta es una transcripción de prueba',
  audio: 'https://example.com/audio.mp3',
  created_at: '2025-10-15T10:00:00Z'
};

describe('SeleccionHistorial - Smoke Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debe renderizar el modal cuando show es true', () => {
    const onClose = jest.fn();
    const onDelete = jest.fn();
    
    render(
      <SeleccionHistorial 
        show={true}
        transcripcion={mockAudio}
        onClose={onClose}
        onDelete={onDelete}
      />
    );
    
    expect(screen.getByText('Test Audio')).toBeInTheDocument();
    expect(screen.getByText(/Esta es una transcripción de prueba/i)).toBeInTheDocument();
  });

  test('no debe renderizar cuando show es false', () => {
    const onClose = jest.fn();
    const onDelete = jest.fn();
    
    const { container } = render(
      <SeleccionHistorial 
        show={false}
        transcripcion={mockAudio}
        onClose={onClose}
        onDelete={onDelete}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  test('debe permitir editar la transcripción al hacer clic', () => {
    const onClose = jest.fn();
    const onDelete = jest.fn();
    
    render(
      <SeleccionHistorial 
        show={true}
        transcripcion={mockAudio}
        onClose={onClose}
        onDelete={onDelete}
      />
    );
    
    // Hacer clic en el texto para editar
    const text = screen.getByText(/Esta es una transcripción de prueba/i);
    fireEvent.click(text);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe(mockAudio.transcription);
  });

  test('debe guardar cambios en la transcripción', async () => {
    axios.put.mockResolvedValueOnce({ data: { success: true } });
    
    const onClose = jest.fn();
    const onDelete = jest.fn();
    
    render(
      <SeleccionHistorial 
        show={true}
        transcripcion={mockAudio}
        onClose={onClose}
        onDelete={onDelete}
      />
    );
    
    // Activar modo edición
    const text = screen.getByText(/Esta es una transcripción de prueba/i);
    fireEvent.click(text);
    
    // Cambiar texto
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Nueva transcripción editada' } });
    
    // Guardar
    const saveButton = screen.getByText(/Guardar/i);
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining('/api/audios/updateTranscription'),
        expect.objectContaining({ 
          id: 1,
          transcription: 'Nueva transcripción editada' 
        })
      );
    });
  });

  test('debe mostrar confirmación al intentar eliminar', () => {
    const onClose = jest.fn();
    const onDelete = jest.fn();
    
    render(
      <SeleccionHistorial 
        show={true}
        transcripcion={mockAudio}
        onClose={onClose}
        onDelete={onDelete}
      />
    );
    
    const deleteButton = screen.getByText(/Eliminar audio/i);
    fireEvent.click(deleteButton);
    
    expect(screen.getByText(/¿Estás seguro/i)).toBeInTheDocument();
  });

  test('debe eliminar el audio al confirmar', async () => {
    axios.delete.mockResolvedValueOnce({ data: { success: true } });
    
    const onClose = jest.fn();
    const onDelete = jest.fn();
    
    render(
      <SeleccionHistorial 
        show={true}
        transcripcion={mockAudio}
        onClose={onClose}
        onDelete={onDelete}
      />
    );
    
    // Abrir confirmación
    const deleteButton = screen.getByText(/Eliminar audio/i);
    fireEvent.click(deleteButton);
    
    // Confirmar eliminación
    const confirmButton = screen.getByText(/Sí, eliminar/i);
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/api/audios/1')
      );
      expect(onDelete).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  test('debe cancelar la eliminación', () => {
    const onClose = jest.fn();
    const onDelete = jest.fn();
    
    render(
      <SeleccionHistorial 
        show={true}
        transcripcion={mockAudio}
        onClose={onClose}
        onDelete={onDelete}
      />
    );
    
    // Abrir confirmación
    const deleteButton = screen.getByText(/Eliminar audio/i);
    fireEvent.click(deleteButton);
    
    // Cancelar
    const cancelButton = screen.getByText(/Cancelar/i);
    fireEvent.click(cancelButton);
    
    expect(axios.delete).not.toHaveBeenCalled();
    expect(screen.queryByText(/¿Estás seguro/i)).not.toBeInTheDocument();
  });

  test('debe cerrar el modal al hacer clic en X', () => {
    const onClose = jest.fn();
    const onDelete = jest.fn();
    
    render(
      <SeleccionHistorial 
        show={true}
        transcripcion={mockAudio}
        onClose={onClose}
        onDelete={onDelete}
      />
    );
    
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });
});
