import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { MetadataController } from '../controllers/metadataController';
import { ImageController } from '../controllers/imageController';
import { ProgressCallback } from '../types';

export function createRouter(
    metadataController: MetadataController,
    imageController: ImageController
): Router {
    const router: Router = Router();

    router.get('/metadata/generate', async (req: Request, res: Response): Promise<void> => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        try {
            const sendProgress: ProgressCallback = (progress) => {
                res.write(`data: ${JSON.stringify(progress)}\n\n`);
            };

            const result = await metadataController.generateMetadata(sendProgress);
            sendProgress({
                type: 'complete',
                total: result.total,
                successful: result.successful,
                failed: result.failed,
                details: result.details,
                stopped: result.stopped
            });
            res.end();
        } catch (error) {
            console.error('Router error:', error);
            res.write(`data: ${JSON.stringify({
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            })}\n\n`);
            res.end();
        }
    });

    router.post('/config/directory', async (req: Request, res: Response): Promise<void> => {
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
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    router.get('/metadata/files', async (req: Request, res: Response): Promise<void> => {
        try {
            const metadataDir = path.join(__dirname, '../../data/metadata');
            const getAllFiles = async (dir: string): Promise<string[]> => {
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
                return paths.flat().filter((path): path is string => path !== null);
            };

            const files = await getAllFiles(metadataDir);
            res.json(files);
        } catch (error) {
            console.error('Error getting files:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    router.get('/metadata/file/:filename(*)', async (req: Request, res: Response): Promise<void> => {
        try {
            const filePath = path.join(__dirname, '../../data/metadata', req.params.filename);
            const data = await fs.readFile(filePath, 'utf-8');
            res.json(JSON.parse(data));
        } catch (error) {
            console.error('Error reading file:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    router.post('/metadata/stop', async (req: Request, res: Response): Promise<void> => {
        try {
            await metadataController.stopGeneration();
            res.json({ success: true });
        } catch (error) {
            console.error('Error stopping metadata generation:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    router.post('/upload/image', async (req: Request, res: Response): Promise<void> => {
        if (!imageController) {
            res.status(500).json({
                error: 'Image controller not initialized'
            });
            return;
        }

        try {
            await imageController.uploadImage(req, res);
        } catch (error) {
            console.error('Router error:', error);
            res.status(500).json({
                error: 'Router error',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    router.get('/version', async (req: Request, res: Response): Promise<void> => {
        try {
            const versionPath = path.join(__dirname, '../../VERSION');
            const version = await fs.readFile(versionPath, 'utf-8');
            res.json({ version: version.trim() });
        } catch (error) {
            console.error('Error reading version:', error);
            res.json({ version: '0.0.0' });
        }
    });

    router.get('/metadata/date-range', async (req: Request, res: Response): Promise<void> => {
        try {
            const metadataDir = path.join(__dirname, '../../data/metadata');
            const getAllFiles = async (dir: string): Promise<string[]> => {
                const files = await fs.readdir(dir, { withFileTypes: true });
                const paths = await Promise.all(files.map(async (file) => {
                    const filePath = path.join(dir, file.name);
                    if (file.isDirectory()) {
                        return getAllFiles(filePath);
                    } else if (file.name.endsWith('.json')) {
                        return file.name;
                    }
                    return null;
                }));
                return paths.flat().filter((path): path is string => path !== null);
            };

            const files = await getAllFiles(metadataDir);
            if (files.length === 0) {
                res.json({ start: null, end: null });
                return;
            }

            const dates = files.map(filename => {
                const match = filename.match(/VRChat_(\d{4}-\d{2})/);
                return match ? match[1] : null;
            }).filter((date): date is string => date !== null);

            if (dates.length === 0) {
                res.json({ start: null, end: null });
                return;
            }

            dates.sort();
            res.json({
                start: dates[0],
                end: dates[dates.length - 1]
            });
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    router.post('/metadata/filter', async (req: Request, res: Response): Promise<void> => {
        try {
            const { startDate, endDate } = req.body;
            const metadataDir = path.join(__dirname, '../../data/metadata');

            const getAllFiles = async (dir: string): Promise<string[]> => {
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
                return paths.flat().filter((path): path is string => path !== null);
            };

            const files = await getAllFiles(metadataDir);
            const filteredFiles = files.filter(filename => {
                const match = filename.match(/VRChat_(\d{4}-\d{2})/);
                if (!match) return false;

                const fileDate = match[1];
                return fileDate >= startDate && fileDate <= endDate;
            });

            res.json(filteredFiles);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    return router;
}