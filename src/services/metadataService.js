const fs = require('fs').promises;
const path = require('path');
const PNGParser = require('../utils/pngParser');

class MetadataService {
    constructor(config) {
        if (!config.imgDir || !config.metadataDir) {
            throw new Error('Required configuration missing');
        }
        this.imgDir = config.imgDir;
        this.metadataDir = config.metadataDir;
    }

    async initialize() {
        try {
            await fs.mkdir(this.metadataDir, { recursive: true });
            console.log('Metadata directory initialized:', this.metadataDir);
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw new Error(`Failed to initialize metadata directory: ${error.message}`);
            }
        }
    }

    async findPNGFiles(directory) {
        console.log('Scanning directory:', directory);
        let pngFiles = [];

        try {
            const entries = await fs.readdir(directory, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(directory, entry.name);

                if (entry.isDirectory()) {
                    console.log('Found subdirectory:', fullPath);
                    const subDirFiles = await this.findPNGFiles(fullPath);
                    pngFiles = pngFiles.concat(subDirFiles);
                }
                else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
                    console.log('Found PNG file:', fullPath);
                    const relativePath = path.relative(this.imgDir, fullPath);
                    pngFiles.push({
                        fullPath,
                        relativePath
                    });
                }
            }
        } catch (error) {
            console.error('Error scanning directory:', directory, error);
        }

        return pngFiles;
    }

    async processImage(imagePath) {
        try {
            console.log('Processing image:', imagePath);
            const parser = new PNGParser(imagePath);
            const metadata = await parser.parse();

            const relativePath = path.relative(this.imgDir, imagePath);
            const relativeDir = path.dirname(relativePath);
            const fileName = path.basename(imagePath, '.png') + '.json';
            const outputDir = path.join(this.metadataDir, relativeDir);
            const outputPath = path.join(outputDir, fileName);

            await fs.mkdir(path.dirname(outputPath), { recursive: true });

            await fs.writeFile(outputPath, JSON.stringify(metadata, null, 2), 'utf-8');
            console.log('Saved metadata to:', outputPath);

            return {
                originalPath: imagePath,
                metadata
            };
        } catch (error) {
            throw new Error(`Failed to process image ${path.basename(imagePath)}: ${error.message}`);
        }
    }

    async processDirectory(progressCallback) {
        try {
            console.log('Starting directory scan at:', this.imgDir);
            const pngFiles = await this.findPNGFiles(this.imgDir);
            const totalFiles = pngFiles.length;
            console.log(`Found ${totalFiles} PNG files in total`);

            progressCallback({
                type: 'start',
                total: totalFiles
            });

            const results = [];
            for (let i = 0; i < pngFiles.length; i++) {
                const file = pngFiles[i];
                try {
                    console.log(`Processing file (${i + 1}/${totalFiles}): ${file.relativePath}`);
                    const result = await this.processImage(file.fullPath);
                    results.push({
                        file: file.relativePath,
                        success: true,
                        metadata: result.metadata
                    });

                    progressCallback({
                        type: 'progress',
                        current: i + 1,
                        total: totalFiles,
                        file: file.relativePath
                    });

                } catch (error) {
                    console.error(`Error processing ${file.relativePath}:`, error);
                    results.push({
                        file: file.relativePath,
                        success: false,
                        error: error.message
                    });

                    progressCallback({
                        type: 'progress',
                        current: i + 1,
                        total: totalFiles,
                        file: file.relativePath,
                        error: true
                    });
                }
            }

            return results;
        } catch (error) {
            console.error('Error in processDirectory:', error);
            throw error;
        }
    }
}

module.exports = MetadataService;