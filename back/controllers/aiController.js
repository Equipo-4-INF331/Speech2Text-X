import { db } from '../database.js';
import { generarResumen as aiResumen, generarIdeasPrincipales as aiIdeas, generarExtractos as aiExtractos } from '../services/aiService.js';

export const generarResumen = async (req, res) => {
  try {
    const { id } = req.params;
    const audio = await db`SELECT transcription FROM audios WHERE id = ${id}`;
    if (!audio[0] || !audio[0].transcription) {
      return res.status(404).json({ error: 'Transcripción no encontrada' });
    }
    const transcription = audio[0].transcription;

    const result = await aiResumen(transcription);
    // Guardar en DB
    await db`UPDATE audios SET resumen = ${result.resumen} WHERE id = ${id}`;
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error generando resumen:', error);
    res.status(500).json({ error: 'Error al generar resumen' });
  }
}

export const generarIdeasPrincipales = async (req, res) => {
  try {
    const { id } = req.params;
    const audio = await db`SELECT transcription FROM audios WHERE id = ${id}`;
    if (!audio[0] || !audio[0].transcription) {
      return res.status(404).json({ error: 'Transcripción no encontrada' });
    }
    const transcription = audio[0].transcription;
    console.log('Audio found:', audio[0]);

    const result = await aiIdeas(transcription);
    console.log('Result ideas:', result.ideas);
    // Guardar en DB
    console.log('Guardando ideas_principales:', JSON.stringify(result.ideas));
    await db`UPDATE audios SET ideas_principales = ${JSON.stringify(result.ideas)} WHERE id = ${id}`;
    console.log('Ideas guardadas en DB para id:', id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error generando ideas:', error);
    res.status(500).json({ error: 'Error al generar ideas principales' });
  }
}

export const generarExtractos = async (req, res) => {
  try {
    const { id } = req.params;
    const audio = await db`SELECT transcription FROM audios WHERE id = ${id}`;
    if (!audio[0] || !audio[0].transcription) {
      return res.status(404).json({ error: 'Transcripción no encontrada' });
    }
    const transcription = audio[0].transcription;

    const result = await aiExtractos(transcription);
    // Guardar en DB
    await db`UPDATE audios SET extractos = ${JSON.stringify(result.extractos)} WHERE id = ${id}`;
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error generando extractos:', error);
    res.status(500).json({ error: 'Error al generar extractos' });
  }
}