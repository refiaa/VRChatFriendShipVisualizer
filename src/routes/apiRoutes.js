const express = require('express');
const fs = require('fs').promises;
const path = require('path');

function createRouter(metadataController, imageController) {
    const router = express.Router();

    router.get('/metadata/generate', async (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        try {
            const sendProgress = (progress) => {
                res.write(`data: ${JSON.stringify(progress)}\n\n`);
            };

            const result = await metadataController.generateMetadata(sendProgress);
            sendProgress({ type: 'complete', ...result });
            res.end();
        } catch (error) {
            console.error('Router error:', error);
            res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
            res.end();
        }
    });

    router.post('/config/directory', async (req, res) => {
        try {
            const { directory } = req.body;
            const absolutePath = directory ? path.resolve(directory) : path.join(__dirname, '../../img');

            const stats = await fs.stat(absolutePath);
            if (!stats.isDirectory()) {
                throw new Error('Not a directory');
            }

            await fs.access(absolutePath, fs.constants.R_OK);

            metadataController.updateConfig({ imgDir: absolutePath });

            res.json({
                success: true,
                directory: absolutePath
            });
        } catch (error) {
            console.error('Error updating directory:', error);
            res.status(400).json({
                success: false,
                error: error.message
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

    router.post('/metadata/stop', async (req, res) => {
        try {
            await metadataController.stopGeneration();
            res.json({ success: true });
        } catch (error) {
            console.error('Error stopping metadata generation:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    router.post('/upload/image', async (req, res) => {
        if (!imageController) {
            return res.status(500).json({
                error: 'Image controller not initialized'
            });
        }

        try {
            await imageController.uploadImage(req, res);
        } catch (error) {
            console.error('Router error:', error);
            res.status(500).json({
                error: 'Router error',
                details: error.message
            });
        }
    });

    return router;
}

module.exports = createRouter;