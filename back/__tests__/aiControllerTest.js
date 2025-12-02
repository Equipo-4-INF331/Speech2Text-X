const { generarResumen, generarIdeasPrincipales, generarExtractos } = require('../controllers/aiController');
const aiService = require('../services/aiService');
const { db } = require('../database');

// Mock del servicio de AI y DB
jest.mock('../services/aiService');
jest.mock('../database');

describe('AI Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: { id: '1' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('generarResumen', () => {
    it('debería generar resumen exitosamente', async () => {
      const mockAudio = [{ transcription: 'Texto de prueba' }];
      db.mockResolvedValue(mockAudio);
      const mockResumen = { resumen: 'Resumen generado' };
      aiService.generarResumen.mockResolvedValue(mockResumen);

      await generarResumen(req, res);

      expect(db).toHaveBeenNthCalledWith(1, ['SELECT transcription FROM audios WHERE id = ', ''], '1');
      expect(aiService.generarResumen).toHaveBeenCalledWith('Texto de prueba');
      expect(db).toHaveBeenNthCalledWith(2, ['UPDATE audios SET resumen = ', ' WHERE id = ', ''], 'Resumen generado', '1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockResumen });
    });

    it('debería manejar transcripción no encontrada', async () => {
      db.mockResolvedValue([]);

      await generarResumen(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Transcripción no encontrada' });
    });

    it('debería manejar transcripción vacía', async () => {
      const mockAudio = [{ transcription: null }];
      db.mockResolvedValue(mockAudio);

      await generarResumen(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Transcripción no encontrada' });
    });

    it('debería manejar error al generar resumen', async () => {
      const mockAudio = [{ transcription: 'Texto de prueba' }];
      db.mockResolvedValue(mockAudio);
      const error = new Error('Error de AI');
      aiService.generarResumen.mockRejectedValue(error);

      await generarResumen(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al generar resumen' });
    });
  });

  describe('generarIdeasPrincipales', () => {
    it('debería generar ideas principales exitosamente', async () => {
      const mockAudio = [{ transcription: 'Texto de prueba' }];
      db.mockResolvedValue(mockAudio);
      const mockIdeas = { ideas: ['Idea 1', 'Idea 2'] };
      aiService.generarIdeasPrincipales.mockResolvedValue(mockIdeas);

      await generarIdeasPrincipales(req, res);

      expect(aiService.generarIdeasPrincipales).toHaveBeenCalledWith('Texto de prueba');
      expect(db).toHaveBeenNthCalledWith(2, ['UPDATE audios SET ideas_principales = ', ' WHERE id = ', ''], '["Idea 1","Idea 2"]', '1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockIdeas });
    });

    it('debería manejar error al generar ideas', async () => {
      const mockAudio = [{ transcription: 'Texto de prueba' }];
      db.mockResolvedValue(mockAudio);
      const error = new Error('Error de AI');
      aiService.generarIdeasPrincipales.mockRejectedValue(error);

      await generarIdeasPrincipales(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al generar ideas principales' });
    });

    it('debería manejar transcripción no encontrada', async () => {
      db.mockResolvedValue([]);

      await generarIdeasPrincipales(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Transcripción no encontrada' });
    });

    it('debería manejar transcripción vacía', async () => {
      const mockAudio = [{ transcription: null }];
      db.mockResolvedValue(mockAudio);

      await generarIdeasPrincipales(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Transcripción no encontrada' });
    });
  });

  describe('generarExtractos', () => {
    it('debería generar extractos exitosamente', async () => {
      const mockAudio = [{ transcription: 'Texto de prueba' }];
      db.mockResolvedValue(mockAudio);
      const mockExtractos = { extractos: ['Extracto 1', 'Extracto 2'] };
      aiService.generarExtractos.mockResolvedValue(mockExtractos);

      await generarExtractos(req, res);

      expect(aiService.generarExtractos).toHaveBeenCalledWith('Texto de prueba');
      expect(db).toHaveBeenNthCalledWith(2, ['UPDATE audios SET extractos = ', ' WHERE id = ', ''], '["Extracto 1","Extracto 2"]', '1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockExtractos });
    });

    it('debería manejar error al generar extractos', async () => {
      const mockAudio = [{ transcription: 'Texto de prueba' }];
      db.mockResolvedValue(mockAudio);
      const error = new Error('Error de AI');
      aiService.generarExtractos.mockRejectedValue(error);

      await generarExtractos(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al generar extractos' });
    });

    it('debería manejar transcripción no encontrada', async () => {
      db.mockResolvedValue([]);

      await generarExtractos(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Transcripción no encontrada' });
    });

    it('debería manejar transcripción vacía', async () => {
      const mockAudio = [{ transcription: null }];
      db.mockResolvedValue(mockAudio);

      await generarExtractos(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Transcripción no encontrada' });
    });
  });
});
