const express = require('express');
const cors = require('cors');
const uploadRoutes = require('./routes/uploadRoutes');
const { connectRedis } = require('./services/redisService');
const dotenv = require('dotenv');
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/upload', uploadRoutes);

connectRedis().then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to connect to Redis:', err);
    process.exit(1);
});


