import express from 'express';
import { getAudio, newAudio, deleteAudio, showAllAudios, updateTranscription } from '../controllers/audiosController.js';


const router = express.Router();

router.get('/:id', getAudio);
router.get('/', showAllAudios);
router.post('/', newAudio);
router.delete('/:id', deleteAudio);
router.put('/:id', updateTranscription);

export default router;