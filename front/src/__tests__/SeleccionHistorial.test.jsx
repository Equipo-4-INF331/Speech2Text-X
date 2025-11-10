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

  // Tests para funcionalidades de ChatIA
  test('debe generar resumen exitosamente', async () => {
    const onUpdateAudio = jest.fn();
    axios.post.mockResolvedValueOnce({
      data: { data: { resumen: 'Resumen generado por IA' } }
    });

    render(
      <SeleccionHistorial 
        show={true}
        transcripcion={mockAudio}
        onClose={jest.fn()}
        onDelete={jest.fn()}
        onUpdateAudio={onUpdateAudio}
      />
    );

    const resumenButton = screen.getByText('Generar Resumen');
    fireEvent.click(resumenButton);

    // Verificar estado de carga
    expect(screen.getByText('Generando análisis...')).toBeInTheDocument();

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/audios/1/resumen')
      );
      expect(onUpdateAudio).toHaveBeenCalledWith(1, { resumen: 'Resumen generado por IA' });
      expect(screen.getByText('Resumen generado por IA')).toBeInTheDocument();
    });
  });

  test('debe manejar error al generar resumen', async () => {
    axios.post.mockRejectedValueOnce(new Error('API error'));

    render(
      <SeleccionHistorial 
        show={true}
        transcripcion={mockAudio}
        onClose={jest.fn()}
        onDelete={jest.fn()}
        onUpdateAudio={jest.fn()}
      />
    );

    const resumenButton = screen.getByText('Generar Resumen');
    fireEvent.click(resumenButton);

    await waitFor(() => {
      expect(screen.getByText('Error al generar resumen')).toBeInTheDocument();
    });
  });

  test('debe generar ideas principales exitosamente', async () => {
    const onUpdateAudio = jest.fn();
    axios.post.mockResolvedValueOnce({
      data: { data: { ideas: ['Idea 1', 'Idea 2', 'Idea 3'] } }
    });

    render(
      <SeleccionHistorial 
        show={true}
        transcripcion={mockAudio}
        onClose={jest.fn()}
        onDelete={jest.fn()}
        onUpdateAudio={onUpdateAudio}
      />
    );

    const ideasButton = screen.getByText('Ideas Principales');
    fireEvent.click(ideasButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/audios/1/ideas')
      );
      expect(onUpdateAudio).toHaveBeenCalledWith(1, { ideas_principales: ['Idea 1', 'Idea 2', 'Idea 3'] });
      expect(screen.getByText('Idea 1')).toBeInTheDocument();
      expect(screen.getByText('Idea 2')).toBeInTheDocument();
      expect(screen.getByText('Idea 3')).toBeInTheDocument();
    });
  });

  test('debe manejar error al generar ideas principales', async () => {
    axios.post.mockRejectedValueOnce(new Error('API error'));

    render(
      <SeleccionHistorial 
        show={true}
        transcripcion={mockAudio}
        onClose={jest.fn()}
        onDelete={jest.fn()}
        onUpdateAudio={jest.fn()}
      />
    );

    const ideasButton = screen.getByText('Ideas Principales');
    fireEvent.click(ideasButton);

    await waitFor(() => {
      expect(screen.getByText('Error al generar ideas principales')).toBeInTheDocument();
    });
  });

  test('debe generar extractos exitosamente', async () => {
    const onUpdateAudio = jest.fn();
    axios.post.mockResolvedValueOnce({
      data: { data: { extractos: ['Extracto importante 1', 'Extracto clave 2'] } }
    });

    render(
      <SeleccionHistorial 
        show={true}
        transcripcion={mockAudio}
        onClose={jest.fn()}
        onDelete={jest.fn()}
        onUpdateAudio={onUpdateAudio}
      />
    );

    const extractosButton = screen.getByText('Extractos');
    fireEvent.click(extractosButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/audios/1/extractos')
      );
      expect(onUpdateAudio).toHaveBeenCalledWith(1, { extractos: ['Extracto importante 1', 'Extracto clave 2'] });
      expect(screen.getByText('"Extracto importante 1"')).toBeInTheDocument();
      expect(screen.getByText('"Extracto clave 2"')).toBeInTheDocument();
    });
  });

  test('debe manejar error al generar extractos', async () => {
    axios.post.mockRejectedValueOnce(new Error('API error'));

    render(
      <SeleccionHistorial 
        show={true}
        transcripcion={mockAudio}
        onClose={jest.fn()}
        onDelete={jest.fn()}
        onUpdateAudio={jest.fn()}
      />
    );

    const extractosButton = screen.getByText('Extractos');
    fireEvent.click(extractosButton);

    await waitFor(() => {
      expect(screen.getByText('Error al generar extractos')).toBeInTheDocument();
    });
  });

  test('debe deshabilitar botones durante la generación de AI', async () => {
    axios.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <SeleccionHistorial 
        show={true}
        transcripcion={mockAudio}
        onClose={jest.fn()}
        onDelete={jest.fn()}
        onUpdateAudio={jest.fn()}
      />
    );

    const resumenButton = screen.getByText('Generar Resumen');
    const ideasButton = screen.getByText('Ideas Principales');
    const extractosButton = screen.getByText('Extractos');

    fireEvent.click(resumenButton);

    // Los botones deberían estar deshabilitados durante la carga
    expect(resumenButton).toBeDisabled();
    expect(ideasButton).toBeDisabled();
    expect(extractosButton).toBeDisabled();

    await waitFor(() => {
      expect(resumenButton).not.toBeDisabled();
    });
  });

  test('debe limpiar resultados de IA al cambiar transcripción', () => {
    const { rerender } = render(
      <SeleccionHistorial 
        show={true}
        transcripcion={{ ...mockAudio, resumen: 'Resumen anterior', ideas_principales: ['Idea anterior'], extractos: ['Extracto anterior'] }}
        onClose={jest.fn()}
        onDelete={jest.fn()}
        onUpdateAudio={jest.fn()}
      />
    );

    expect(screen.getByText('Resumen anterior')).toBeInTheDocument();

    rerender(
      <SeleccionHistorial 
        show={true}
        transcripcion={{ ...mockAudio, id: 2, resumen: '', ideas_principales: [], extractos: [] }}
        onClose={jest.fn()}
        onDelete={jest.fn()}
        onUpdateAudio={jest.fn()}
      />
    );

    expect(screen.queryByText('Resumen anterior')).not.toBeInTheDocument();
  });
});
