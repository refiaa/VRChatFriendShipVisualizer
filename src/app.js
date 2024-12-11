const express = require('express');
const path = require('path');
const MetadataService = require('./services/metadataService');
const MetadataController = require('./controllers/metadataController');
const createApiRouter = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// 設定
const config = {
    imgDir: path.join(__dirname, '../img'),
    metadataDir: path.join(__dirname, '../data/metadata')
};

// ServiceとControllerの初期化
const metadataService = new MetadataService(config);
const metadataController = new MetadataController(metadataService);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Router設定
const apiRouter = createApiRouter(metadataController);
app.use('/api', apiRouter);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;