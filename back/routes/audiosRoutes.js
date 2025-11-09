import express from 'express';
import { getAudio, newAudio, deleteAudio, updateTranscription, historial, filterAudios, upload } from '../controllers/audiosController.js';


const router = express.Router();
router.get("/", (req, res) => {
  res.json({ ok: true, message: "Router de audios operativo" });
});
router.get('/filter', filterAudios);
router.get('/:id', getAudio);
router.post('/historial', historial);
router.delete('/:id', deleteAudio);
router.put('/updateTranscription', updateTranscription);
router.post('/', upload.single('file'), newAudio);

export default router;
