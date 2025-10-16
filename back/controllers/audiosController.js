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
const s3 = new S3Client(s3Config);

export { upload };

export const historial = async(req,res) =>{
  try{
    const{username} = req.body;
    const transcripciones = await db`SELECT * FROM audios WHERE username = ${username} ORDER BY created_at DESC`
    res.status(200).json({ success: true, data: transcripciones });
    console.log('query result:', transcripciones);

  } catch (error){
    res.status(500).json({ error: `Error al obtener el historia: ${error}`});
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
  try {
    const file = req.file;
    const { name: bodyName, transcription } = req.body;
    const username = req.body.username || "anonymous";

    if (!file && !bodyName) {
      return res.status(400).json({ error: "Falta archivo o nombre" });
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

      try {
        await s3.send(new PutObjectCommand(putParams));
      } catch (s3err) {
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
    let query = 'SELECT * FROM audios WHERE 1=1';
    const params = [];

    if (username) {
      query += ' AND username = $' + (params.length + 1);
      params.push(username);
    }

    if (name) {
      query += ' AND name ILIKE $' + (params.length + 1);
      params.push(`%${name}%`);
    }

    if (description) {
      query += ' AND transcription ILIKE $' + (params.length + 1);
      params.push(`%${description}%`);
    }

    if (dateFrom && dateTo) {
      query += ' AND DATE(created_at) BETWEEN $' + (params.length + 1) + ' AND $' + (params.length + 2);
      params.push(dateFrom, dateTo);
    } else if (dateFrom) {
      query += ' AND DATE(created_at) >= $' + (params.length + 1);
      params.push(dateFrom);
    } else if (dateTo) {
      query += ' AND DATE(created_at) <= $' + (params.length + 1);
      params.push(dateTo);
    }

    query += ' ORDER BY created_at DESC';

    const audios = await db.unsafe(query, params);
    res.set('Cache-Control', 'no-cache');
    res.status(200).json({ success: true, data: audios });
  } catch (error) {
    console.error(error.stack || error);
    res.status(500).json({ error: 'Error al filtrar audios' });
  }
}
