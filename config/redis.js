const redis = require('redis');
const dotenv=require('dotenv');
dotenv.config();
const client = redis.createClient({

    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

module.exports = client;
