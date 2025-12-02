import { db } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { generarResumen, generarIdeasPrincipales, generarExtractos } from '../services/aiService.js';
import { isAllowedEmail, sendInvitationEmail, sendShareEmail as sendShareEmailService } from '../services/emailService.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    const username = req.user.username;
    const transcripciones = await db`SELECT * FROM audios WHERE username = ${username} ORDER BY created_at DESC`
    res.status(200).json({ success: true, data: transcripciones });

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
    const bodyName  = req.body.nombre;
    const username = req.user.username;
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
    if (file && process.env.OPENAI_API_KEY) {
      try {
        // ✅ normalizar tipo MIME
        let mimeType = file.mimetype;
        if (mimeType === "audio/x-m4a") mimeType = "audio/m4a";

        console.log("🎤 Enviando a OpenAI:", file.originalname, mimeType);

        const ext = path.extname(file.originalname) || ".m4a";
        const tmpDir = path.join(process.cwd(), "tmp");
        fs.mkdirSync(tmpDir, { recursive: true });
        tmpPath = path.join(tmpDir, `tmp_${Date.now()}${ext}`);
        fs.writeFileSync(tmpPath, file.buffer);

        const stream = fs.createReadStream(tmpPath);
        console.log(tmpPath);

        const response = await openai.audio.transcriptions.create({
          model: "gpt-4o-transcribe-diarize",
          file: stream,
          response_format: "diarized_json", // salida estructurada
          chunking_strategy: "auto", // obligatorio si dura más de 30s
          // el tipo no es necesario en la API nueva, solo el stream
        });

        let diarizedText = "";
        const segments = Array.isArray(response?.segments) ? response.segments : [];
        segments.forEach(seg => {
          diarizedText += `${seg.speaker}: ${seg.text.trim()}\n`;
        });

        transcriptionResult = diarizedText || null;


        fs.unlinkSync(tmpPath);
        console.log("✅ Transcripción completada con éxito");
      } catch (openErr) {
        console.error("❌ Error en transcripción OpenAI:", openErr);
      }
    }
    console.log("🗃️ Insertando en BD:", { username, name, audioUrl, transcriptionResult });

    // --- 🗃️ GUARDAR EN BASE DE DATOS ---
      // Permitir control de visibilidad desde el upload (visibility: 'owner'|'private'|'public')
      const visibility = req.body.visibility || 'owner';
      const isPublicFlag = visibility === 'public';
      const generatedToken = (visibility === 'public' || visibility === 'private') ? uuidv4() : null;

      const elem = await db`
        INSERT INTO audios (username, name, audio, transcription, is_public, share_token, visibility)
        VALUES (${username}, ${name}, ${audioUrl}, ${transcriptionResult}, ${isPublicFlag}, ${generatedToken}, ${visibility})
        RETURNING *
      `;

      // Si la visibilidad es 'private' y vienen viewers, crear registros y enviar invitaciones
      if (visibility === 'private' && req.body.viewers) {
        const viewersCsv = typeof req.body.viewers === 'string' ? req.body.viewers : (Array.isArray(req.body.viewers) ? req.body.viewers.join(',') : '');
        const emails = viewersCsv.split(',').map(e => e.trim()).filter(Boolean);
          if (emails.length > 0) {
          const origin = process.env.PUBLIC_ORIGIN || `http://localhost:${process.env.PORT || 3000}`;

          for (const email of emails) {
            const viewerToken = uuidv4();
            await db`INSERT INTO audio_viewers (audio_id, email, viewer_token, verified) VALUES (${elem[0].id}, ${email}, ${viewerToken}, false)`;
            const link = `${origin}/share/${generatedToken}?viewerToken=${viewerToken}`;
            const result = await sendInvitationEmail(email, link, name);
            if (!result.success) {
              console.error('Error enviando invitación durante upload', result.reason || result.error);
            }
          }
        }
      }

    // --- 🤖 GENERAR CONTENIDO AI AUTOMÁTICusername: 'user1'AMENTE ---
    if (transcriptionResult) {
      try {
        console.log('🤖 Generando resumen, ideas principales y extractos automáticamente...');
        const [resumenResult, ideasResult, extractosResult] = await Promise.allSettled([
          generarResumen(transcriptionResult),
          generarIdeasPrincipales(transcriptionResult),
          generarExtractos(transcriptionResult)
        ]);

        const resumen = resumenResult.status === 'fulfilled' ? resumenResult.value.resumen : null;
        const ideas_principales = ideasResult.status === 'fulfilled' ? ideasResult.value.ideas : null;
        const extractos = extractosResult.status === 'fulfilled' ? extractosResult.value.extractos : null;
        // Actualizar la DB con los resultados
        await db`
          UPDATE audios
          SET resumen = ${resumen}, ideas_principales = ${(ideas_principales)}, extractos = ${(extractos)}
          WHERE id = ${elem[0].id}
        `;

        // Actualizar el objeto retornado
        elem[0].resumen = resumen;
        elem[0].ideas_principales = ideas_principales;
        elem[0].extractos = extractos;

        console.log('✅ Contenido AI generado y guardado exitosamente');
      } catch (error) {
        console.error('❌ Error generando contenido AI:', error);
      }
    }

    res.status(201).json({ success: true, data: elem[0] });
  } catch (error) {
    console.error(error);
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

export const setVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const { visibility, token: providedToken } = req.body; // 'owner' | 'private' | 'public', optional token

    const rows = await db`SELECT * FROM audios WHERE id = ${id} LIMIT 1`;
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Audio no encontrado' });
    const audio = rows[0];

    let token = providedToken || audio.share_token;
    if (visibility === 'owner') {
      token = null;
    } else if ((visibility === 'public' || visibility === 'private') && !token) {
      token = uuidv4();
    }

    const is_public_flag = visibility === 'public';
    await db`
      UPDATE audios
      SET visibility = ${visibility}, is_public = ${is_public_flag}, share_token = ${token}
      WHERE id = ${id}
      RETURNING *
    `;

    const origin = process.env.PUBLIC_ORIGIN || `http://localhost:${process.env.PORT || 3000}`;
    const link = token ? `${origin}/share/${token}` : null;

    return res.status(200).json({ success: true, data: { token, link, visibility } });
  } catch (err) {
    console.error('Error en setVisibility:', err.stack || err);
    return res.status(500).json({ error: 'Error actualizando visibilidad' });
  }
};

export const getByShareToken = async (req, res) => {
  try {
    const { token } = req.params;
    const viewerToken = req.query.viewerToken || req.query.tokenViewer || null;

    const rows = await db`SELECT * FROM audios WHERE share_token = ${token} LIMIT 1`;
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Link no válido' });
    const audio = rows[0];

    try {
      let fileKey = audio.audio;
      let url = null;
      if (fileKey) {
        const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
        if (bucket) {
          if (fileKey.includes('.amazonaws.com/')) {
            const parts = fileKey.split('.com/');
            if (parts.length > 1) fileKey = parts[1];
          }
          try {
            const command = new GetObjectCommand({ Bucket: bucket, Key: fileKey });
            url = await getSignedUrl(s3, command, { expiresIn: 3600 });
          } catch (presignErr) {
            console.warn('getByShareToken: presign failed', presignErr && presignErr.message ? presignErr.message : presignErr);
            url = null;
          }
        }
      }
      if (url) audio.url = url;
    } catch (attachErr) {
      console.warn('getByShareToken: attach url error', attachErr && attachErr.message ? attachErr.message : attachErr);
    }    if (audio.visibility === 'public') return res.status(200).json({ success: true, data: audio });

    if (audio.visibility === 'owner') {
      return res.status(404).json({ error: 'Link no válido' });
    }

    if (audio.visibility === 'private') {
      if (!viewerToken) return res.status(404).json({ error: 'Link privado: token de viewer requerido' });
      const vrows = await db`SELECT * FROM audio_viewers WHERE viewer_token = ${viewerToken} AND audio_id = ${audio.id} LIMIT 1`;
      if (!vrows || vrows.length === 0) return res.status(404).json({ error: 'Token de viewer inválido' });
      if (!vrows[0].verified) {
        await db`UPDATE audio_viewers SET verified = true WHERE id = ${vrows[0].id}`;
      }
      return res.status(200).json({ success: true, data: audio, viewer: { email: vrows[0].email, verified: true } });
    }

    return res.status(404).json({ error: 'Link no válido' });
  } catch (err) {
    console.error('Error en getByShareToken:', err.stack || err);
    return res.status(500).json({ error: 'Error buscando recurso' });
  }
};

export const sendShareEmail = async (req, res) => {
  try {
    const { emailDestino, link, titulo } = req.body;
    if (!emailDestino || !link) return res.status(400).json({ error: 'emailDestino y link son requeridos' });

    const result = await sendShareEmailService(emailDestino, link, titulo);
    if (result.success) {
      return res.status(200).json({ success: true, info: result.info });
    } else {
      return res.status(500).json({ error: 'Error enviando email' });
    }
  } catch (err) {
    console.error('Error en sendShareEmail:', err.stack || err);
    return res.status(500).json({ error: 'Error enviando email' });
  }
};

export const inviteViewers = async (req, res) => {
  try {
    const { id } = req.params; 
    const { emails } = req.body; 
    if (!emails || !Array.isArray(emails) || emails.length === 0) return res.status(400).json({ error: 'emails es requerido' });

    const rows = await db`SELECT * FROM audios WHERE id = ${id} LIMIT 1`;
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Audio no encontrado' });
    const audio = rows[0];

    const origin = process.env.PUBLIC_ORIGIN || `http://localhost:${process.env.PORT || 3000}`;

    const results = [];
      for (const email of emails) {
      const viewerToken = uuidv4();
      await db`
        INSERT INTO audio_viewers (audio_id, email, viewer_token, verified)
        VALUES (${id}, ${email}, ${viewerToken}, false)
      `;

      let shareToken = audio.share_token;
      if (!shareToken) {
        shareToken = uuidv4();
        await db`UPDATE audios SET share_token = ${shareToken}, visibility = 'private', is_public = false WHERE id = ${id}`;
      } else {
        await db`UPDATE audios SET visibility = 'private', is_public = false WHERE id = ${id}`;
      }

      const link = `${origin}/share/${shareToken}?viewerToken=${viewerToken}`;

      const result = await sendInvitationEmail(email, link, audio.name);
      results.push({ email, ok: result.success, reason: result.success ? null : (result.reason || result.error) });
    }

    return res.status(200).json({ success: true, results });
  } catch (err) {
    console.error('Error en inviteViewers:', err.stack || err);
    return res.status(500).json({ error: 'Error invitando viewers' });
  }
};

export const verifyViewer = async (req, res) => {
  try {
    const { viewerToken } = req.params;
    const vrows = await db`SELECT * FROM audio_viewers WHERE viewer_token = ${viewerToken} LIMIT 1`;
    if (!vrows || vrows.length === 0) return res.status(404).json({ error: 'Token inválido' });
    const viewer = vrows[0];
    if (!viewer.verified) {
      await db`UPDATE audio_viewers SET verified = true WHERE id = ${viewer.id}`;
    }
    const audioRows = await db`SELECT * FROM audios WHERE id = ${viewer.audio_id} LIMIT 1`;
    return res.status(200).json({ success: true, data: { audio: audioRows[0], viewer: { email: viewer.email, verified: true } } });
  } catch (err) {
    console.error('Error en verifyViewer:', err.stack || err);
    return res.status(500).json({ error: 'Error verificando viewer' });
  }
};

export const streamAudio = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await db`SELECT * FROM audios WHERE id = ${id} LIMIT 1`;
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Audio no encontrado' });
    const audio = rows[0];

    if (!audio.audio) return res.status(404).json({ error: 'Archivo de audio no disponible' });

    // If audio.audio is a full URL, proxy it through the server to avoid CORS issues.
    if (audio.audio.startsWith('http://') || audio.audio.startsWith('https://')) {
      // Use node http/https to stream
      const url = new URL(audio.audio);
      const protocol = url.protocol === 'https:' ? await import('https') : await import('http');
      const client = protocol;
      return client.get(audio.audio, (remoteRes) => {
        if (remoteRes.statusCode && remoteRes.statusCode >= 400) {
          res.status(remoteRes.statusCode).end();
          return;
        }
        const contentType = remoteRes.headers['content-type'] || 'audio/mpeg';
        if (!res.headersSent) res.setHeader('Content-Type', contentType);
        remoteRes.pipe(res);
      }).on('error', (err) => {
        console.error('Error proxying audio URL:', err);
        return res.status(500).json({ error: 'Error al transmitir audio' });
      });
    }

    // Otherwise try to stream from S3 using GetObjectCommand
    const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
    if (!bucket) return res.status(404).json({ error: 'No S3 bucket configured' });

    let key = audio.audio;
    // If stored as full URL, extract key after .com/
    if (key.includes('.amazonaws.com/')) {
      const parts = key.split('.com/');
      if (parts.length > 1) key = parts[1];
    }

    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const s3resp = await s3.send(command);
    const contentType = s3resp.ContentType || 'audio/mpeg';
    if (!res.headersSent) res.setHeader('Content-Type', contentType);
    const body = s3resp.Body;
    // Pipe the S3 stream to response
    if (body && typeof body.pipe === 'function') {
      body.pipe(res);
    } else if (body && body instanceof ArrayBuffer) {
      res.send(Buffer.from(body));
    } else {
      res.status(500).json({ error: 'No se pudo transmitir audio' });
    }
  } catch (err) {
    console.error('Error en streamAudio:', err.stack || err);
    return res.status(500).json({ error: 'Error transmitiendo audio' });
  }
};

export const filterAudios = async (req, res) => {
  try {
    const username = req.user.username;
    const { name, description, dateFrom, dateTo } = req.query;
    
    const audios = await db`
      SELECT *
      FROM audios
      WHERE username = ${username}
      ${name ? db`AND name ILIKE ${'%' + name + '%'}` : db``}
      ${description ? db`AND transcription ILIKE ${'%' + description + '%'}` : db``}
      ${dateFrom ? db`AND DATE(created_at) >= ${dateFrom}` : db``}
      ${dateTo ? db`AND DATE(created_at) <= ${dateTo}` : db``}
      ORDER BY created_at DESC
    `;

    // Procesar URLs y generar presigned URLs si es necesario
    const audiosWithUrls = await Promise.all(
      audios.map(async (audio) => {
        let fileKey = audio.audio;
        if (!fileKey) return { ...audio, url: null };

        try {
          // Si viene una URL completa, extraemos la parte del archivo
          if (fileKey.startsWith("https://")) {
            const parts = fileKey.split(".com/");
            if (parts.length > 1) fileKey = parts[1]; // ej: audios/archivo.mp3
          }

          const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: fileKey,
          });

          // Firmamos SIEMPRE
          const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
          return { ...audio, url: signedUrl };
        } catch (err) {
          console.error("Error al generar URL firmada:", err);
          return { ...audio, url: null };
        }
      })
    );

    res.set('Cache-Control', 'no-cache');
    res.status(200).json({ success: true, data: audiosWithUrls  });
  } catch (error) {
    console.error('Error en filterAudios:', error.stack || error);
    res.status(500).json({ error: 'Error al filtrar audios' });
  }
}
