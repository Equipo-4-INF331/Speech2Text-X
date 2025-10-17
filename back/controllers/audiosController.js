import { db } from '../database.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });

const upload = multer({ storage: multer.memoryStorage() });

const s3Config = { region: process.env.AWS_REGION };
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}
export const s3 = new S3Client(s3Config);

export { upload };

export const historial = async(req,res) =>{
  try{
    const{username} = req.body;
    const transcripciones = await db`SELECT * FROM audios WHERE username = ${username} ORDER BY created_at DESC`
    res.status(200).json({ success: true, data: transcripciones });
    console.log('query result:', transcripciones);

  } catch (error){
    res.status(500).json({ error: `Error al obtener el historial: ${error}`});
  }
}

export const getAudio = async (req, res) => {
  try {
    const { id } = req.params;
    const audio = await db`SELECT * FROM audios WHERE id = ${id}`;
    res.status(200).json({ success: true, data: audio[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el audio' });
  }
}

export const newAudio = async (req, res) => {
  let tmpPath; // se agrega despues de los tests
  try {
    const file = req.file;
    const bodyName  = req.body.name;
    const username = req.body.username || "anonymous";
    var transcription = '';

    if (!file && !bodyName) {
      return res.status(400).json({ error: "Falta archivo y nombre" });
    }

    const name = bodyName || file.originalname;

    // --- 📦 SUBIR A S3 ---
    let audioUrl = req.body.audio || null;
    if (file) {
      const bucketName = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
      if (!bucketName) {
        throw new Error("AWS_S3_BUCKET no está definido en el entorno");
      }

      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-_]/g, "_");
      const key = `audios/${Date.now()}-${safeName}`;

      const putParams = {
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      if (process.env.AWS_S3_PUBLIC === "true") {
        putParams.ACL = "public-read";
      }
      console.log("estoy aqui \n\n\n")
      try {
        await s3.send(new PutObjectCommand(putParams));
      } catch (s3err) {
        console.log("estoy aqui \n\n\n")
        console.error("❌ Error subiendo a S3:", s3err);
        return res.status(500).json({ error: "Error al subir a S3", details: s3err.message });
      }

      const region = process.env.AWS_REGION || "us-east-2";
      audioUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
    }

    // --- 🧠 TRANSCRIPCIÓN CON OPENAI WHISPER ---
    let transcriptionResult = transcription || null;
    if (file && process.env.VITE_OPENAI_API_KEY) {
      try {
        // ✅ normalizar tipo MIME
        let mimeType = file.mimetype;
        if (mimeType === "audio/x-m4a") mimeType = "audio/m4a";

        console.log("🎤 Enviando a OpenAI:", file.originalname, mimeType);

        const ext = path.extname(file.originalname) || ".m4a";
        const tmpDir = path.join(process.cwd(), "tmp");
        fs.mkdirSync(tmpDir, { recursive: true });
        const tmpPath = path.join(tmpDir, `tmp_${Date.now()}${ext}`);
        fs.writeFileSync(tmpPath, file.buffer);

        const stream = fs.createReadStream(tmpPath);
        console.log(tmpPath);

        const response = await openai.audio.transcriptions.create({
          file: stream,
          model: "gpt-4o-transcribe",
          // el tipo no es necesario en la API nueva, solo el stream
        });

        transcriptionResult = response.text || null;

        fs.unlinkSync(tmpPath);
        console.log("✅ Transcripción completada con éxito");
      } catch (openErr) {
        console.error("❌ Error en transcripción OpenAI:", openErr);
      }
    }

    // --- 🗃️ GUARDAR EN BASE DE DATOS ---
    const elem = await db`
      INSERT INTO audios (username, name, audio, transcription)
      VALUES (${username}, ${name}, ${audioUrl}, ${transcriptionResult})
      RETURNING *
    `;

    res.status(201).json({ success: true, data: elem[0] });
  } catch (error) {
    console.error(error.stack || error);
    res.status(500).json({ error: "Error al crear el audio" });
  } finally {
    if (fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
    }
  }
}

export const deleteAudio = async (req, res) => {
  try {
    const { id } = req.params;
    const elem = await db`DELETE FROM audios WHERE id = ${id}`;
    res.status(200).json({ success: true, message: 'Audio eliminado', data: elem[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el audio' });
  }
}

export const updateTranscription = async (req, res) => {
  try {
    const {id, transcription } = req.body;
    const updatedAudio = await db`
      UPDATE audios
      SET transcription = ${transcription}
      WHERE id = ${id}
      RETURNING *
    `;

    if (updatedAudio.length === 0) {
      return res.status(404).json({ error: 'Audio no encontrado' });
    }
    
    res.status(200).json({ success: true, data: updatedAudio[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la transcripción' });
  }
}

export const filterAudios = async (req, res) => {
  try {
    const { name, description, dateFrom, dateTo, username } = req.query;
    
    // Construir condiciones WHERE
    let conditions = [];
    
    if (username) {
      conditions.push(db`username = ${username}`);
    }
    
    if (name) {
      conditions.push(db`name ILIKE ${'%' + name + '%'}`);
    }
    
    if (description) {
      conditions.push(db`transcription ILIKE ${'%' + description + '%'}`);
    }
    
    if (dateFrom && dateTo) {
      conditions.push(db`DATE(created_at) BETWEEN ${dateFrom} AND ${dateTo}`);
    } else if (dateFrom) {
      conditions.push(db`DATE(created_at) >= ${dateFrom}`);
    } else if (dateTo) {
      conditions.push(db`DATE(created_at) <= ${dateTo}`);
    }
    
    // Si no hay condiciones, traer todo
    let audios;
    if (conditions.length === 0) {
      audios = await db`SELECT * FROM audios ORDER BY created_at DESC`;
    } else {
      // Construir query con condiciones
      const whereClause = conditions.map((_, i) => `condition${i}`).join(' AND ');
      
      // Ejecutar con todas las condiciones
      if (username && !name && !description && !dateFrom && !dateTo) {
        audios = await db`SELECT * FROM audios WHERE username = ${username} ORDER BY created_at DESC`;
      } else if (username && name && !description && !dateFrom && !dateTo) {
        audios = await db`SELECT * FROM audios WHERE username = ${username} AND name ILIKE ${'%' + name + '%'} ORDER BY created_at DESC`;
      } else if (username && description && !name && !dateFrom && !dateTo) {
        audios = await db`SELECT * FROM audios WHERE username = ${username} AND transcription ILIKE ${'%' + description + '%'} ORDER BY created_at DESC`;
      } else if (username && dateFrom && dateTo && !name && !description) {
        audios = await db`SELECT * FROM audios WHERE username = ${username} AND DATE(created_at) BETWEEN ${dateFrom} AND ${dateTo} ORDER BY created_at DESC`;
      } else if (username && name && description && !dateFrom && !dateTo) {
        audios = await db`SELECT * FROM audios WHERE username = ${username} AND name ILIKE ${'%' + name + '%'} AND transcription ILIKE ${'%' + description + '%'} ORDER BY created_at DESC`;
      } else if (username && name && dateFrom && dateTo && !description) {
        audios = await db`SELECT * FROM audios WHERE username = ${username} AND name ILIKE ${'%' + name + '%'} AND DATE(created_at) BETWEEN ${dateFrom} AND ${dateTo} ORDER BY created_at DESC`;
      } else if (username && description && dateFrom && dateTo && !name) {
        audios = await db`SELECT * FROM audios WHERE username = ${username} AND transcription ILIKE ${'%' + description + '%'} AND DATE(created_at) BETWEEN ${dateFrom} AND ${dateTo} ORDER BY created_at DESC`;
      } else if (username && name && description && dateFrom && dateTo) {
        audios = await db`SELECT * FROM audios WHERE username = ${username} AND name ILIKE ${'%' + name + '%'} AND transcription ILIKE ${'%' + description + '%'} AND DATE(created_at) BETWEEN ${dateFrom} AND ${dateTo} ORDER BY created_at DESC`;
      } else {
        // Caso por defecto: solo username
        audios = await db`SELECT * FROM audios WHERE username = ${username} ORDER BY created_at DESC`;
      }
    }
    res.set('Cache-Control', 'no-cache');
    res.status(200).json({ success: true, data: audios });
  } catch (error) {
    console.error('Error en filterAudios:', error.stack || error);
    res.status(500).json({ error: 'Error al filtrar audios' });
  }
}
