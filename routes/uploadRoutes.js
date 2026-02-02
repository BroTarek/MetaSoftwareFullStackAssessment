const express = require('express');
const multer = require('multer');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/start', uploadController.startUpload);
router.post('/chunk/:uploadId/:chunkIndex', upload.single('chunk'), uploadController.uploadChunk);
router.get('/status/:uploadId', uploadController.checkStatus);
router.post('/finalize/:uploadId', uploadController.finalizeUpload);

module.exports = router;
