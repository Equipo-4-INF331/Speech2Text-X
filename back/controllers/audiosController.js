import { db } from '../database.js';

export const showAllAudios = async (req, res) => {
  try {
    const audios = await db`SELECT * FROM audios ORDER BY created_at DESC`;
    console.log('query result:', audios);
    res.status(200).json({ success: true, data: audios });
  } catch (error) {
    console.error(error.stack || error);
    res.status(500).json({ error: 'Error al obtener audios' });
  }
}

export const historial = async(req,res) =>{
  try{
    const{username} = req.body;
    console.log(username);
    const transcipciones = await db`SELECT * FROM audios WHERE username = ${username} ORDER BY created_at DESC`
    res.status(200).json({ success: true, data: transcipciones });

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
  const { username,name ,audio, transcription } = req.body;
  try {
    const elem = await db`
      INSERT INTO audios (username,name, audio, transcription)
      VALUES (${username},${name}, ${audio}, ${transcription})
      RETURNING *
    `;
    res.status(201).json({ success: true, data: elem[0] });
  } catch (error) {
    res.status(500).json({ error: `Error al crear el audio: ${error}` });

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