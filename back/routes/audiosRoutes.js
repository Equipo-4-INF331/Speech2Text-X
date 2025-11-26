import express from 'express';
import { getAudio, newAudio, deleteAudio, updateTranscription, historial, filterAudios, upload } from '../controllers/audiosController.js';
import { generarResumen, generarIdeasPrincipales, generarExtractos } from '../controllers/aiController.js';


const router = express.Router();
router.get("/", (req, res) => {
  res.json({ ok: true, message: "Router de audios operativo" });
});
router.get('/filter', filterAudios);
router.get('/historial', historial);

router.get('/:id', getAudio);
router.delete('/:id', deleteAudio);
router.post('/:id/resumen', generarResumen);
router.post('/:id/ideas', generarIdeasPrincipales);
router.post('/:id/extractos', generarExtractos);

router.put('/updateTranscription', updateTranscription);
router.post('/', upload.single('file'), newAudio);

export default router;
