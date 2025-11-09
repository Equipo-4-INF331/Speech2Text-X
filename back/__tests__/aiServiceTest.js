import { GoogleGenAI, mockGenerateContent } from '@google/genai';
import { generarResumen, generarIdeasPrincipales, generarExtractos } from '../services/aiService.js';

jest.mock('@google/genai', () => {
  const mockFn = jest.fn();
  return {
    GoogleGenAI: jest.fn(() => ({
      models: {
        generateContent: mockFn,
      },
    })),
    mockGenerateContent: mockFn,
  };
});

describe('aiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generarResumen', () => {
    it('debería generar resumen exitosamente', async () => {
      const mockResponse = { text: '{"resumen": "Resumen generado"}' };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await generarResumen('transcripción de prueba');

      expect(mockGenerateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents: 'Summarize this transcription into 3-5 key sentences: transcripción de prueba',
        config: expect.objectContaining({
          systemInstruction: expect.any(String),
          responseMimeType: 'application/json',
          responseSchema: expect.any(Object),
        }),
      });
      expect(result).toEqual({ resumen: 'Resumen generado' });
    });

    it('debería manejar error de parsing JSON', async () => {
      const mockResponse = { text: 'invalid json' };
      mockGenerateContent.mockResolvedValue(mockResponse);

      await expect(generarResumen('transcripción')).rejects.toThrow('Fallo al obtener una respuesta JSON válida para el resumen.');
    });

    it('debería reintentar en caso de fallo', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce({ text: '{"resumen": "Resumen después de reintento"}' });

      const result = await generarResumen('transcripción');

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ resumen: 'Resumen después de reintento' });
    });

    it('debería fallar después de max reintentos', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API error'));

      await expect(generarResumen('transcripción')).rejects.toThrow('Fallo después de 3 intentos');
    });
  });

  describe('generarIdeasPrincipales', () => {
    it('debería generar ideas principales exitosamente', async () => {
      const mockResponse = { text: '{"ideas": ["- Idea 1", "- Idea 2"]}' };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await generarIdeasPrincipales('transcripción de prueba');

      expect(result).toEqual({ ideas: ['- Idea 1', '- Idea 2'] });
    });

    it('debería manejar error de parsing JSON', async () => {
      const mockResponse = { text: 'invalid json' };
      mockGenerateContent.mockResolvedValue(mockResponse);

      await expect(generarIdeasPrincipales('transcripción')).rejects.toThrow('Fallo al obtener una respuesta JSON válida para las ideas principales.');
    });
  });

  describe('generarExtractos', () => {
    it('debería generar extractos exitosamente', async () => {
      const mockResponse = { text: '{"extractos": ["Extracto 1", "Extracto 2"]}' };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await generarExtractos('transcripción de prueba');

      expect(result).toEqual({ extractos: ['Extracto 1', 'Extracto 2'] });
    });

    it('debería manejar error de parsing JSON', async () => {
      const mockResponse = { text: 'invalid json' };
      mockGenerateContent.mockResolvedValue(mockResponse);

      await expect(generarExtractos('transcripción')).rejects.toThrow('Fallo al obtener una respuesta JSON válida para los extractos.');
    });
  });
});