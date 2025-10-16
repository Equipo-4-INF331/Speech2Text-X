import express from 'express';
import { getAudio, newAudio, deleteAudio, showAllAudios, updateTranscription, upload } from '../controllers/audiosController.js';


const router = express.Router();

router.get('/:id', getAudio);
router.get('/', showAllAudios);
router.post('/', upload.single('file'), newAudio);
router.delete('/:id', deleteAudio);
router.put('/:id', updateTranscription);

export default router;