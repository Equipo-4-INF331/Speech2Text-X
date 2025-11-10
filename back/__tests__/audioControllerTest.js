import { historial, getAudio, newAudio, deleteAudio, updateTranscription, filterAudios, s3 } from '../controllers/audiosController.js';
import { db } from '../database.js';
import fs from 'fs';
import OpenAI from 'openai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';


process.env.AWS_S3_BUCKET = 'test-bucket';
process.env.AWS_ACCESS_KEY_ID = 'fake';
process.env.AWS_SECRET_ACCESS_KEY = 'fake';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_S3_PUBLIC = 'fake';



jest.mock('../database.js', () => ({
  db: jest.fn(),
}));

jest.mock('fs', () => {
  const real = jest.requireActual('fs');
  return {
    ...real,
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    createReadStream: jest.fn(() => 'stream'),
    unlinkSync: jest.fn(),
    existsSync: jest.fn(() => false),
  };
});

jest.mock('@aws-sdk/client-s3', () => {
  const send = jest.fn().mockResolvedValue({}); // puedes sobreescribir en cada test
  const S3Client = jest.fn(() => ({ send }));
  // Deben ser funciones constructor
  const PutObjectCommand = jest.fn(function PutObjectCommand() {});
  const GetObjectCommand = jest.fn(function GetObjectCommand() {});
  return { S3Client, PutObjectCommand, GetObjectCommand };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  // Devuelve algo estable para las URLs firmadas
  getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.example/file.mp3'),
}));

// Mock de OpenAI devolviendo segments como array (para evitar forEach undefined)
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: jest
          .fn()
          .mockResolvedValue({ text: 'transcripción mock', segments: [] }),
      },
    },
  })),
}));

// Esto se creo para mockear cuando usamos filtros ya que jest no lo reconoce a lo anterior como db,  Eso es una tagged template function call, y db no se invoca como una función normal (db()), sino como
jest.mock('../database.js', () => ({
  db: jest.fn(async (...args) => {
    const query = args[0]?.join ? args[0].join(' ') : args[0];
    if (query && query.includes('FROM audios')) {
      return [{
        id: 1,
        username: 'pepe',
        name: 'El que se fue a milipilla',
        audio: 'link',
        transcription: 'El que se fue a milipilla perdio su silla',
        created_at: new Date('2025-10-17T20:00:00Z')
      }];
    }
    return [];
  }),
}));

describe('Audio Controller', () => {

  let res;
  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      set: jest.fn(),
    };
    jest.clearAllMocks();
  });

  // ---------- historial ----------


  it('debería devolver transcripciones exitosamente', async () => {
    db.mockResolvedValueOnce([{ id: 1, username: 'user1', name:'pepe',audio:'link',transcription:'Transcripcion correcta',created_at: new Date('2025-10-16T20:00:00Z') }]);
    const req = { body: { username: 'user1' } };
    await historial(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1, username: 'user1', name:'pepe',audio:'link',transcription:'Transcripcion correcta',created_at: new Date('2025-10-16T20:00:00Z') }] });
  });

    /*
          id SERIAL PRIMARY KEY,
        username VARCHAR(32) NOT NULL,
        name VARCHAR(32) NOT NULL,
        audio VARCHAR(255) NOT NULL,
        transcription TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

        */

  it('debería manejar error en historial', async () => {
    db.mockRejectedValueOnce(new Error('DB error'));
    const req = { body: { username: 'user1' } };
    await historial(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Error al obtener el historial') }));
  });

  
  // ---------- getAudio ----------
  it('debería devolver un audio por id', async () => {
    db.mockResolvedValueOnce([{ id: 1, username: 'user1', name:'Cancion feria',audio:'link',transcription:'Transcripcion correcta',created_at: new Date('2025-10-16T20:00:00Z') }]);
    const req = { params: { id: 1 } };
    await getAudio(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1, username: 'user1', name:'Cancion feria',audio:'link',transcription:'Transcripcion correcta',created_at: new Date('2025-10-16T20:00:00Z') } });
  });

  it('debería manejar error en getAudio', async () => {
    db.mockRejectedValueOnce(new Error('DB error'));
    const req = { params: { id: 1 } };
    await getAudio(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error al obtener el audio" });
  });


 

  // ---------- newAudio ----------
  it('debería devolver 400 si no hay archivo ni nombre', async () => {
    const req = { file: null, body: {} };
    await newAudio(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Falta archivo y nombre" });
  });


  it('debería crear audio con archivo y OpenAI', async () => {
    const file = { originalname: 'audio.mp3', buffer: Buffer.from('data'), mimetype: 'audio/mpeg' };
    const req = { file, body: {  name: "audio.mp3", username: 'oeasfas'} };
    db.mockResolvedValueOnce([{ id: 10, name: 'audio.mp3' }]);
    await newAudio(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 10, name: 'audio.mp3' } });
  });

  /*
  it('debería devolver 500 al intentar conectarse a la bd sin body', async () => {
    const file = { originalname: 'audio.mp3', buffer: Buffer.from('data'), mimetype: 'audio/mpeg' };
    const req = { file, body: {} };
    db.mockRejectedValueOnce(new Error('DB error'));
    await newAudio(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error al crear el audio" });
  });
*/


  it('debería manejar error al subir a S3', async () => {
  const file = { originalname: 'audio.mp3', buffer: Buffer.from('data'), mimetype: 'audio/mpeg' };
  const req = { file, body: { name: 'audio.mp3', username: 'user1' } };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  // Mock directo al método send del objeto s3
  jest.spyOn(s3, 'send').mockRejectedValueOnce(new Error('S3 error'));

  await newAudio(req, res);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ error: 'Error al subir a S3' })
  );
});

  // ---------- deleteAudio ----------
  it('debería eliminar audio', async () => {
    db.mockResolvedValueOnce([{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }]);
    const req = { params: { id: 1 } };
    await deleteAudio(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    
    expect(res.json).toHaveBeenCalledWith({success: true, message: 'Audio eliminado', data:{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }})
  });

  it('debería manejar error en deleteAudio', async () => {
    db.mockRejectedValueOnce(new Error('DB error'));
    const req = { params: { id: 1 } };
    await deleteAudio(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error al eliminar el audio" });
  });


 
  // ---------- updateTranscription ----------
  it('debería actualizar transcripción', async () => {
    db.mockResolvedValueOnce([{ id: 1, username: 'user1', name:'pepe',audio:'link',transcription:'texto',created_at: new Date('2025-10-16T20:00:00Z') }, { id: 1, username: '1asdfga', name:'pasdepe',audio:'link',transcription:'texasdfasto',created_at: new Date('2025-10-16T20:00:00Z') }]);
    const req = { body: { id: 1, transcription:"texto" } };
    await updateTranscription(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data:  { id: 1, username: 'user1', name:'pepe',audio:'link',transcription:'texto',created_at: new Date('2025-10-16T20:00:00Z') } });
  });

  it('debería devolver 404 si audio no encontrado', async () => {
    db.mockResolvedValueOnce([]);
    const req = { body: { id: 1, transcription: { id: 11235123512, username: 'user1', name:'pepe',audio:'link',transcription:'Transcripcion correcta',created_at: new Date('2025-10-16T20:00:00Z')}} };
    await updateTranscription(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Audio no encontrado' });
  });

  it('debería manejar error en updateTranscription', async () => {
    db.mockRejectedValueOnce(new Error('DB error'));
    const req = { body: { id: 1 } };
    await updateTranscription(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error al actualizar la transcripción'});
  });

  // ---------- filterAudios ----------
  it('debería filtrar audios por username', async () => {
    db.mockResolvedValueOnce([{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }]);
    const req = { query:{ name: "El que se fue a milipilla",description:"El que se fue a milipilla perdio su silla" ,dateFrom: new Date('2025-10-16T20:00:00Z'),dateTo: new Date('2025-10-17T20:00:00Z'), username:'pepe'} };
    await filterAudios(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.json).toHaveBeenCalledWith({ success: true, data:[{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }]});
  });

    it('debería filtrar audios por todos los filtros', async () => {
    db.mockResolvedValueOnce([{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }, { id: 1, username: 'pepe', name:'El que se fue a masdilipilla',audio:'linasdfak',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }]);
    const req = { query:{ name: "El que se fue a milipilla",description:"El que se fue a milipilla perdio su silla" ,dateFrom: new Date('2025-10-16T20:00:00Z'),dateTo: new Date('2025-10-17T20:00:00Z'), username:'pepe'} };
    await filterAudios(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.json).toHaveBeenCalledWith({ success: true, data:[{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }]});
  });
  


   //{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }

   
  it('debería manejar error en filterAudios', async () => {
    db.mockRejectedValueOnce(new Error('DB error'));
    const req = { query: {} };
    await filterAudios(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error al filtrar audios" });
  });
});
