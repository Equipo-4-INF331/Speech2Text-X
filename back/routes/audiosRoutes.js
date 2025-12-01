import express from 'express';
import { getAudio, newAudio, deleteAudio, updateTranscription, historial, filterAudios, upload, setVisibility, getByShareToken, sendShareEmail, inviteViewers, verifyViewer, streamAudio } from '../controllers/audiosController.js';
import { generarResumen, generarIdeasPrincipales, generarExtractos } from '../controllers/aiController.js';


const router = express.Router();

router.get('/filter', filterAudios);
router.get('/:id', getAudio);
router.post('/historial', historial);
router.delete('/:id', deleteAudio);
router.put('/updateTranscription', updateTranscription);
router.put('/:id/visibility', setVisibility);
router.get('/share/:token', getByShareToken);
router.get('/:id/stream', streamAudio);
router.post('/share/email', sendShareEmail);
router.post('/:id/invite', inviteViewers);
router.get('/verify-viewer/:viewerToken', verifyViewer);
router.post('/', upload.single('file'), newAudio);
router.post('/:id/resumen', generarResumen);
router.post('/:id/ideas', generarIdeasPrincipales);
router.post('/:id/extractos', generarExtractos);

export default router;