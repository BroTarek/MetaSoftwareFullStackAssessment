const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const redisService = require('../services/redisService');

// 1. Initialize Upload
const startUpload = async (req, res) => {
    const { filename, size, chunkSize } = req.body;
    console.log(`[Backend] Initializing upload for: ${filename} (${size} bytes)`);
    const uploadId = uuidv4();
    const totalChunks = Math.ceil(size / chunkSize);

    const fileInfo = {
        filename,
        size,
        totalChunks,
        chunkSize
    };

    // Store metadata
    await redisService.setEx(`upload:${uploadId}:info`, 3600, JSON.stringify(fileInfo));

    // Initialize progress
    await redisService.hSet(`upload:${uploadId}:progress`, 'uploadedChunks', 0);

    console.log(`[Backend] Upload session created: ${uploadId} (Total Chunks: ${totalChunks})`);
    res.json({ uploadId, totalChunks });
};

// 2. Upload Chunk
const uploadChunk = async (req, res) => {
    const { uploadId, chunkIndex } = req.params;

    if (!req.file) {
        console.error(`[Backend] No file data received for chunk ${chunkIndex} of upload ${uploadId}`);
        return res.status(400).json({ error: 'No chunk data received' });
    }

    const chunkData = req.file.buffer;
    console.log(`[Backend] Receiving chunk ${chunkIndex} for upload ${uploadId} (${chunkData.length} bytes)`);

    try {
        // Cache chunk in Redis
        await redisService.setEx(
            `upload:${uploadId}:chunk:${chunkIndex}`,
            3600,
            chunkData.toString('base64')
        );

        // Update progress
        await redisService.hIncrBy(`upload:${uploadId}:progress`, 'uploadedChunks', 1);

        console.log(`[Backend] Chunk ${chunkIndex} successfully cached in Redis.`);
        res.json({ success: true, chunkIndex });
    } catch (error) {
        console.error(`[Backend] Error caching chunk ${chunkIndex}:`, error);
        res.status(500).json({ error: error.message });
    }
};

// 3. Check Status
const checkStatus = async (req, res) => {
    const { uploadId } = req.params;
    console.log(`[Backend] Checking status for upload: ${uploadId}`);

    const infoStr = await redisService.get(`upload:${uploadId}:info`);
    const progress = await redisService.hGetAll(`upload:${uploadId}:progress`);

    if (!infoStr) {
        console.warn(`[Backend] Status check failed: Upload session ${uploadId} not found`);
        return res.status(404).json({ error: 'Upload session not found or expired' });
    }

    const info = JSON.parse(infoStr);

    // Check which specific chunks are already uploaded
    const uploadedChunksIndices = [];
    for (let i = 0; i < info.totalChunks; i++) {
        const chunkExists = await redisService.exists(`upload:${uploadId}:chunk:${i}`);
        if (chunkExists) {
            uploadedChunksIndices.push(i);
        }
    }

    console.log(`[Backend] Status for ${uploadId}: ${uploadedChunksIndices.length}/${info.totalChunks} chunks found.`);
    res.json({
        ...info,
        uploadedChunksCount: parseInt(progress.uploadedChunks || 0),
        uploadedChunksIndices
    });
};

// 4. Finalize Upload
const finalizeUpload = async (req, res) => {
    const { uploadId } = req.params;

    try {
        const infoStr = await redisService.get(`upload:${uploadId}:info`);
        if (!infoStr) return res.status(404).json({ error: 'Upload not found' });

        const info = JSON.parse(infoStr);
        console.log(`[Backend] Finalizing upload ${uploadId}. Reconstructing ${info.filename} from ${info.totalChunks} chunks.`);

        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

        const filePath = path.join(uploadDir, info.filename);
        const writeStream = fs.createWriteStream(filePath);

        for (let i = 0; i < info.totalChunks; i++) {
            const chunkData = await redisService.get(`upload:${uploadId}:chunk:${i}`);
            if (!chunkData) {
                console.error(`[Backend] Missing chunk ${i} during finalization of ${uploadId}`);
                writeStream.end();
                return res.status(400).json({ error: `Missing chunk ${i}` });
            }
            writeStream.write(Buffer.from(chunkData, 'base64'));
            if (i % 10 === 0 || i === info.totalChunks - 1) {
                console.log(`[Backend] Writing chunk ${i + 1}/${info.totalChunks} to disk...`);
            }
        }

        writeStream.on('finish', async () => {
            console.log(`[Backend] File ${info.filename} successfully reconstructed.`);
            // Cleanup Redis
            const keys = [`upload:${uploadId}:info`, `upload:${uploadId}:progress`];
            for (let i = 0; i < info.totalChunks; i++) {
                keys.push(`upload:${uploadId}:chunk:${i}`);
            }
            await redisService.del(keys);
            res.json({ success: true, filename: info.filename });
        });

        writeStream.end();
    } catch (error) {
        console.error(`[Backend] Error during finalization:`, error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    startUpload,
    uploadChunk,
    checkStatus,
    finalizeUpload
};
