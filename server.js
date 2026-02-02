const express = require('express');
const cors = require('cors');
const uploadRoutes = require('./routes/uploadRoutes');
const { connectRedis } = require('./redisService');
const dotenv = require('dotenv');
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/upload', uploadRoutes);

connectRedis().then(() => {
    app.listen(process.env.PORT, () => {
        console.log(`Server running at http://localhost:${process.env.PORT}`);
    });
}).catch(err => {
    console.error('Failed to connect to Redis:', err);
    process.exit(1);
});


