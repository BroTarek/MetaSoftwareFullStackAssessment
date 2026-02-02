const redisClient = require('../config/redis');

let useMock = false;
const mockStore = new Map();

const connectRedis = async () => {
    redisClient.on('error', (err) => {
        console.warn('Redis Connection Error, using mock store:', err.message);
        useMock = true;
    });

    try {
        await redisClient.connect();
        console.log('Connected to Redis');
    } catch (err) {
        console.warn('Could not connect to Redis, switching to mock storage');
        useMock = true;
    }
};

// Data access methods
const setEx = async (key, seconds, value) => {
    if (useMock) {
        mockStore.set(key, value);
        // Basic TTL simulation for mock
        setTimeout(() => mockStore.delete(key), seconds * 1000);
    } else {
        await redisClient.setEx(key, seconds, value);
    }
};

const get = async (key) => {
    if (useMock) return mockStore.get(key);
    return await redisClient.get(key);
};

const del = async (keys) => {
    if (useMock) {
        if (Array.isArray(keys)) keys.forEach(k => mockStore.delete(k));
        else mockStore.delete(keys);
    } else {
        await redisClient.del(keys);
    }
};

const hIncrBy = async (key, field, value) => {
    if (useMock) {
        const obj = mockStore.get(key) || {};
        obj[field] = (parseInt(obj[field]) || 0) + value;
        mockStore.set(key, obj);
        return obj[field];
    } else {
        return await redisClient.hIncrBy(key, field, value);
    }
};

const hGetAll = async (key) => {
    if (useMock) return mockStore.get(key) || {};
    return await redisClient.hGetAll(key);
};

const hSet = async (key, field, value) => {
    if (useMock) {
        const obj = mockStore.get(key) || {};
        obj[field] = value;
        mockStore.set(key, obj);
    } else {
        await redisClient.hSet(key, field, value);
    }
}

const exists = async (key) => {
    if (useMock) return mockStore.has(key);
    return await redisClient.exists(key);
}

module.exports = {
    connectRedis,
    setEx,
    get,
    del,
    hIncrBy,
    hGetAll,
    hSet,
    exists
};
