const express = require('express');
const path = require('path');
const MetadataService = require('./services/metadataService');
const MetadataController = require('./controllers/metadataController');
const ImageService = require('./services/imageService');
const ImageController = require('./controllers/imageController');
const createApiRouter = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// 設定
const config = {
    imgDir: path.join(__dirname, '../icon'),
    metadataDir: path.join(__dirname, '../data/metadata'),
    uploadDir: path.join(__dirname, '../public/uploads')
};

// ServiceとControllerの初期化
const metadataService = new MetadataService(config);
const metadataController = new MetadataController(metadataService);
const imageService = new ImageService(config);
const imageController = new ImageController(imageService);

// image service初期化
(async () => {
    try {
        await imageService.initialize();
    } catch (error) {
        console.error('Failed to initialize image service:', error);
    }
})();

app.use(express.json({limit: '50mb'}));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/icon', express.static(path.join(__dirname, '../public/icon')));

// Router設定
const apiRouter = createApiRouter(metadataController, imageController);
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