const uploadController = require('../controllers/uploadController');
const redisService = require('../services/redisService');

// Mock uuid
jest.mock('uuid', () => ({
    v4: () => 'mock-uuid'
}));

// Mock redisService
jest.mock('../services/redisService', () => ({
    setEx: jest.fn(),
    hSet: jest.fn(),
    hIncrBy: jest.fn(),
    get: jest.fn(),
    hGetAll: jest.fn(),
    exists: jest.fn(),
    del: jest.fn()
}));

describe('Upload Controller Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            file: {
                buffer: Buffer.from('test data')
            }
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    test('startUpload should calculate correct total chunks and return uploadId', async () => {
        req.body = {
            filename: 'test.txt',
            size: 1050000, // 1.05 MB
            chunkSize: 1000000 // 1 MB
        };

        await uploadController.startUpload(req, res);

        // Check if totalChunks is calculated correctly (Math.ceil(1.05) = 2)
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            totalChunks: 2,
            uploadId: expect.any(String)
        }));

        // Verify Redis service was called to store info
        expect(redisService.setEx).toHaveBeenCalled();
        expect(redisService.hSet).toHaveBeenCalled();
    });

    test('uploadChunk should store chunk in Redis and update progress', async () => {
        req.params = {
            uploadId: 'test-uuid',
            chunkIndex: '0'
        };

        await uploadController.uploadChunk(req, res);

        expect(redisService.setEx).toHaveBeenCalledWith(
            expect.stringContaining('upload:test-uuid:chunk:0'),
            3600,
            expect.any(String) // base64 string
        );
        expect(redisService.hIncrBy).toHaveBeenCalledWith(
            'upload:test-uuid:progress',
            'uploadedChunks',
            1
        );
        expect(res.json).toHaveBeenCalledWith({ success: true, chunkIndex: '0' });
    });
});
