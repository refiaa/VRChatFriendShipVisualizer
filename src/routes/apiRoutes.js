const express = require('express');
const fs = require('fs').promises;
const path = require('path');

function createRouter(metadataController) {
    const router = express.Router();

    router.get('/metadata/generate', async (req, res) => {
        try {
            await metadataController.generateMetadata(req, res);
        } catch (error) {
            console.error('Router error:', error);
            res.status(500).json({
                error: 'Router error',
                details: error.message
            });
        }
    });

    router.get('/metadata/files', async (req, res) => {
        try {
            const metadataDir = path.join(__dirname, '../../data/metadata');
            const getAllFiles = async (dir) => {
                const files = await fs.readdir(dir, { withFileTypes: true });
                const paths = await Promise.all(files.map(async (file) => {
                    const filePath = path.join(dir, file.name);
                    if (file.isDirectory()) {
                        return getAllFiles(filePath);
                    } else if (file.name.endsWith('.json')) {
                        return path.relative(metadataDir, filePath);
                    }
                    return null;
                }));
                return paths.flat().filter(Boolean);
            };

            const files = await getAllFiles(metadataDir);
            res.json(files);
        } catch (error) {
            console.error('Error getting files:', error);
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/metadata/file/:filename(*)', async (req, res) => {
        try {
            const filePath = path.join(__dirname, '../../data/metadata', req.params.filename);
            const data = await fs.readFile(filePath, 'utf-8');
            res.json(JSON.parse(data));
        } catch (error) {
            console.error('Error reading file:', error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = createRouter;