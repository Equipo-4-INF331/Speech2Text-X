export const showAllAudios = async (req, res) => {
  try {
    const audios = await db`SELECT * FROM audios ORDER BY created_at DESC`;
    res.status(200).json({ success: true, data: audios });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener audios' });
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
  const { name, audio, transcription } = req.body;
  try {
    const elem = await db`
      INSERT INTO audios (name, audio, transcription)
      VALUES (${name}, ${audio}, ${transcription})
      RETURNING *
    `;
    res.status(201).json({ success: true, data: elem[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el audio' });
  }
}

export const deleteAudio = async (req, res) => {
  try {
    const { id } = req.params;
    await db`DELETE FROM audios WHERE id = ${id}`;
    res.status(200).json({ success: true, message: 'Audio eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el audio' });
  }
}