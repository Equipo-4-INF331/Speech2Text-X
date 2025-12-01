// Mocks for AWS SDK and fs
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(() => Promise.resolve('https://signed-url.com')),
}));
jest.mock('@smithy/shared-ini-file-loader');

import { historial, getAudio, newAudio, deleteAudio, updateTranscription, filterAudios, s3, setVisibility, getByShareToken, sendShareEmail, inviteViewers, verifyViewer, streamAudio } from '../controllers/audiosController.js';
import { db } from '../database.js';
import fs from 'fs';
import OpenAI from 'openai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

process.env.AWS_S3_BUCKET = 'test-bucket';
process.env.AWS_ACCESS_KEY_ID = 'fake';
process.env.AWS_SECRET_ACCESS_KEY = 'fake';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_S3_PUBLIC = 'fake';



jest.mock('../services/emailService.js', () => ({
  isAllowedEmail: jest.fn(() => true),
  sendInvitationEmail: jest.fn(() => Promise.resolve({ success: true })),
  sendShareEmail: jest.fn(() => Promise.resolve({ success: true, info: 'sent' })),
}));

jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  createReadStream: jest.fn(() => 'stream'),
  unlinkSync: jest.fn(),
  existsSync: jest.fn(() => false),
  promises: {
    readFile: jest.fn().mockResolvedValue(''),
  },
}));

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn(() => Promise.resolve('uploaded')),
    })),
    PutObjectCommand: jest.fn((params) => ({ ...params })),
    GetObjectCommand: jest.fn((params) => ({ ...params })),
  };
});

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: jest.fn(() => Promise.resolve({ text: 'Transcripción mock' })),
      },
    },
  }));
});

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
      setHeader: jest.fn(),
      send: jest.fn(),
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
    expect(res.json).toHaveBeenCalledWith({ success: true, data:[{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z'), url: 'https://signed-url.com' }]});
  });

    it('debería filtrar audios por todos los filtros', async () => {
    db.mockResolvedValueOnce([{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }, { id: 1, username: 'pepe', name:'El que se fue a masdilipilla',audio:'linasdfak',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }]);
    const req = { query:{ name: "El que se fue a milipilla",description:"El que se fue a milipilla perdio su silla" ,dateFrom: new Date('2025-10-16T20:00:00Z'),dateTo: new Date('2025-10-17T20:00:00Z'), username:'pepe'} };
    await filterAudios(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.json).toHaveBeenCalledWith({ success: true, data:[{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z'), url: 'https://signed-url.com' }]});
  });

  it('debería filtrar audios solo por name', async () => {
    db.mockResolvedValueOnce([{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }]);
    const req = { query:{ name: "El que se fue a milipilla" } };
    await filterAudios(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.json).toHaveBeenCalledWith({ success: true, data:[{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z'), url: 'https://signed-url.com' }]});
  });

  it('debería filtrar audios solo por description', async () => {
    db.mockResolvedValueOnce([{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }]);
    const req = { query:{ description: "El que se fue a milipilla perdio su silla" } };
    await filterAudios(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.json).toHaveBeenCalledWith({ success: true, data:[{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z'), url: 'https://signed-url.com' }]});
  });

  it('debería filtrar audios solo por dateFrom', async () => {
    db.mockResolvedValueOnce([{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }]);
    const req = { query:{ dateFrom: new Date('2025-10-16T20:00:00Z') } };
    await filterAudios(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.json).toHaveBeenCalledWith({ success: true, data:[{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z'), url: 'https://signed-url.com' }]});
  });

  it('debería filtrar audios solo por dateTo', async () => {
    db.mockResolvedValueOnce([{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }]);
    const req = { query:{ dateTo: new Date('2025-10-17T20:00:00Z') } };
    await filterAudios(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.json).toHaveBeenCalledWith({ success: true, data:[{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z'), url: 'https://signed-url.com' }]});
  });

  it('debería filtrar audios por name y description', async () => {
    db.mockResolvedValueOnce([{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }]);
    const req = { query:{ name: "El que se fue a milipilla", description: "El que se fue a milipilla perdio su silla" } };
    await filterAudios(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.json).toHaveBeenCalledWith({ success: true, data:[{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z'), url: 'https://signed-url.com' }]});
  });

  it('debería filtrar audios por name y dateFrom', async () => {
    db.mockResolvedValueOnce([{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }]);
    const req = { query:{ name: "El que se fue a milipilla", dateFrom: new Date('2025-10-16T20:00:00Z') } };
    await filterAudios(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.json).toHaveBeenCalledWith({ success: true, data:[{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z'), url: 'https://signed-url.com' }]});
  });

  it('debería filtrar audios por name y dateTo', async () => {
    db.mockResolvedValueOnce([{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }]);
    const req = { query:{ name: "El que se fue a milipilla", dateTo: new Date('2025-10-17T20:00:00Z') } };
    await filterAudios(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.json).toHaveBeenCalledWith({ success: true, data:[{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z'), url: 'https://signed-url.com' }]});
  });

  it('debería filtrar audios por description y dateFrom', async () => {
    db.mockResolvedValueOnce([{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }]);
    const req = { query:{ description: "El que se fue a milipilla perdio su silla", dateFrom: new Date('2025-10-16T20:00:00Z') } };
    await filterAudios(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.json).toHaveBeenCalledWith({ success: true, data:[{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z'), url: 'https://signed-url.com' }]});
  });

  it('debería filtrar audios por description y dateTo', async () => {
    db.mockResolvedValueOnce([{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }]);
    const req = { query:{ description: "El que se fue a milipilla perdio su silla", dateTo: new Date('2025-10-17T20:00:00Z') } };
    await filterAudios(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.json).toHaveBeenCalledWith({ success: true, data:[{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z'), url: 'https://signed-url.com' }]});
  });

  it('debería filtrar audios por dateFrom y dateTo', async () => {
    db.mockResolvedValueOnce([{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }]);
    const req = { query:{ dateFrom: new Date('2025-10-16T20:00:00Z'), dateTo: new Date('2025-10-17T20:00:00Z') } };
    await filterAudios(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.json).toHaveBeenCalledWith({ success: true, data:[{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z'), url: 'https://signed-url.com' }]});
  });
  


   //{ id: 1, username: 'pepe', name:'El que se fue a milipilla',audio:'link',transcription:'El que se fue a milipilla perdio su silla',created_at: new Date('2025-10-17T20:00:00Z') }

   
  it('debería manejar error en filterAudios', async () => {
    db.mockRejectedValueOnce(new Error('DB error'));
    const req = { query: {} };
    await filterAudios(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error al filtrar audios" });
  });

  // ---------- setVisibility ----------
  it('debería cambiar visibilidad a public y generar token', async () => {
    db.mockResolvedValueOnce([{ id: 1, share_token: null }]);
    db.mockResolvedValueOnce([{ id: 1, visibility: 'public', is_public: true, share_token: 'new-token' }]);
    const req = { params: { id: 1 }, body: { visibility: 'public' } };
    await setVisibility(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { token: expect.any(String), link: expect.stringContaining('/share/'), visibility: 'public' } });
  });

  it('debería cambiar visibilidad a private y generar token', async () => {
    db.mockResolvedValueOnce([{ id: 1, share_token: null }]);
    db.mockResolvedValueOnce([{ id: 1, visibility: 'private', is_public: false, share_token: 'new-token' }]);
    const req = { params: { id: 1 }, body: { visibility: 'private' } };
    await setVisibility(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { token: expect.any(String), link: expect.stringContaining('/share/'), visibility: 'private' } });
  });

  it('debería cambiar visibilidad a owner sin token', async () => {
    db.mockResolvedValueOnce([{ id: 1, share_token: 'old-token' }]);
    db.mockResolvedValueOnce([{ id: 1, visibility: 'owner', is_public: false, share_token: null }]);
    const req = { params: { id: 1 }, body: { visibility: 'owner' } };
    await setVisibility(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { token: null, link: null, visibility: 'owner' } });
  });

  it('debería devolver 404 si audio no encontrado en setVisibility', async () => {
    db.mockResolvedValueOnce([]);
    const req = { params: { id: 1 }, body: { visibility: 'public' } };
    await setVisibility(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Audio no encontrado' });
  });

  it('debería manejar error en setVisibility', async () => {
    db.mockRejectedValueOnce(new Error('DB error'));
    const req = { params: { id: 1 }, body: { visibility: 'public' } };
    await setVisibility(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error actualizando visibilidad' });
  });

  // ---------- getByShareToken ----------
  it('debería devolver audio público por token', async () => {
    db.mockResolvedValueOnce([{ id: 1, audio: 'file.mp3', visibility: 'public', share_token: 'token' }]);
    const req = { params: { token: 'token' }, query: {} };
    await getByShareToken(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1, audio: 'file.mp3', visibility: 'public', share_token: 'token', url: 'https://signed-url.com' } });
  });

  it('debería devolver audio privado con viewer token válido', async () => {
    db.mockResolvedValueOnce([{ id: 1, audio: 'file.mp3', visibility: 'private', share_token: 'token' }]);
    db.mockResolvedValueOnce([{ id: 1, email: 'test@example.com', verified: false }]);
    const req = { params: { token: 'token' }, query: { viewerToken: 'viewer-token' } };
    await getByShareToken(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1, audio: 'file.mp3', visibility: 'private', share_token: 'token', url: 'https://signed-url.com' }, viewer: { email: 'test@example.com', verified: true } });
  });

  it('debería devolver 404 para audio owner por token', async () => {
    db.mockResolvedValueOnce([{ id: 1, visibility: 'owner', share_token: 'token' }]);
    const req = { params: { token: 'token' }, query: {} };
    await getByShareToken(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Link no válido' });
  });

  it('debería devolver 404 para token inválido', async () => {
    db.mockResolvedValueOnce([]);
    const req = { params: { token: 'invalid' }, query: {} };
    await getByShareToken(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Link no válido' });
  });

  it('debería manejar error en getByShareToken', async () => {
    db.mockRejectedValueOnce(new Error('DB error'));
    const req = { params: { token: 'token' }, query: {} };
    await getByShareToken(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error buscando recurso' });
  });

  // ---------- sendShareEmail ----------
  it('debería enviar email de share exitosamente', async () => {
    const req = { body: { emailDestino: 'test@example.com', link: 'http://example.com/share/token', titulo: 'Test Audio' } };
    await sendShareEmail(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, info: 'sent' });
  });

  it('debería devolver 400 si falta email o link en sendShareEmail', async () => {
    const req = { body: {} };
    await sendShareEmail(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'emailDestino y link son requeridos' });
  });

  it('debería manejar error en sendShareEmail', async () => {
    // Mock the email service to return failure
    const emailService = require('../services/emailService.js');
    emailService.sendShareEmail.mockResolvedValueOnce({ success: false });
    const req = { body: { emailDestino: 'test@example.com', link: 'http://example.com' } };
    await sendShareEmail(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error enviando email' });
  });

  // ---------- inviteViewers ----------
  it('debería invitar viewers exitosamente', async () => {
    db.mockResolvedValueOnce([{ id: 1, share_token: null }]);
    db.mockResolvedValueOnce(); // insert
    db.mockResolvedValueOnce(); // update
    const req = { params: { id: 1 }, body: { emails: ['test@example.com'] } };
    await inviteViewers(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, results: [{ email: 'test@example.com', ok: true, reason: null }] });
  });

  it('debería devolver 404 si audio no encontrado en inviteViewers', async () => {
    db.mockResolvedValueOnce([]);
    const req = { params: { id: 1 }, body: { emails: ['test@example.com'] } };
    await inviteViewers(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Audio no encontrado' });
  });

  it('debería manejar error en inviteViewers', async () => {
    db.mockRejectedValueOnce(new Error('DB error'));
    const req = { params: { id: 1 }, body: { emails: ['test@example.com'] } };
    await inviteViewers(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error invitando viewers' });
  });

  // ---------- verifyViewer ----------
  it('debería verificar viewer exitosamente', async () => {
    db.mockResolvedValueOnce([{ id: 1, email: 'test@example.com', verified: false, audio_id: 1 }]);
    db.mockResolvedValueOnce([{ id: 1 }]);
    const req = { params: { viewerToken: 'viewer-token' } };
    await verifyViewer(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { audio: { id: 1, username: 'pepe', name: 'El que se fue a milipilla', audio: 'link', transcription: 'El que se fue a milipilla perdio su silla', created_at: new Date('2025-10-17T20:00:00Z') }, viewer: { email: 'test@example.com', verified: true } } });
  });

  it('debería devolver 404 para token inválido en verifyViewer', async () => {
    db.mockResolvedValueOnce([]);
    const req = { params: { viewerToken: 'invalid' } };
    await verifyViewer(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
  });

  it('debería manejar error en verifyViewer', async () => {
    db.mockRejectedValueOnce(new Error('DB error'));
    const req = { params: { viewerToken: 'token' } };
    await verifyViewer(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error verificando viewer' });
  });

  // ---------- streamAudio ----------
  it('debería transmitir audio desde S3', async () => {
    db.mockResolvedValueOnce([{ id: 1, audio: 'audios/file.mp3' }]);
    const mockS3Resp = { ContentType: 'audio/mpeg', Body: { pipe: jest.fn() } };
    s3.send.mockResolvedValueOnce(mockS3Resp);
    const req = { params: { id: 1 } };
    await streamAudio(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
    expect(mockS3Resp.Body.pipe).toHaveBeenCalledWith(res);
  });

  it('debería devolver 404 si audio no encontrado en streamAudio', async () => {
    db.mockResolvedValueOnce([{ id: 1, audio: null }]);
    const req = { params: { id: 1 } };
    await streamAudio(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Archivo de audio no disponible' });
  });

  it('debería manejar error en streamAudio', async () => {
    db.mockRejectedValueOnce(new Error('DB error'));
    const req = { params: { id: 1 } };
    await streamAudio(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error transmitiendo audio' });
  });

  it('debería manejar body como ArrayBuffer en streamAudio', async () => {
    db.mockResolvedValueOnce([{ id: 1, audio: 'audios/file.mp3' }]);
    const mockS3Resp = { ContentType: 'audio/mpeg', Body: new ArrayBuffer(8) };
    s3.send.mockResolvedValueOnce(mockS3Resp);
    const req = { params: { id: 1 } };
    await streamAudio(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
    expect(res.send).toHaveBeenCalledWith(Buffer.from(new ArrayBuffer(8)));
  });
});
