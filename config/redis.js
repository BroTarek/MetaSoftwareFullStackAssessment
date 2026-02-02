const redis = require('redis');
const dotenv = require('dotenv');
dotenv.config();

// Prepare connection config
const redisUrl = process.env.REDIS_URL || process.env.REDIS_PUBLIC_URL;

const clientConfig = redisUrl ? {
    url: redisUrl
} : {
    username: process.env.REDIS_USERNAME || process.env.REDISUSER || 'default',
    password: process.env.REDIS_PASSWORD || process.env.REDISPASSWORD,
    socket: {
        host: process.env.REDIS_HOST || process.env.REDISHOST,
        port: parseInt(process.env.REDIS_PORT || process.env.REDISPORT || '6379')
    }
};

const client = redis.createClient(clientConfig);

module.exports = client;

