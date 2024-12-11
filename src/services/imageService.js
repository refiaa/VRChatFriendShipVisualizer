const fs = require('fs').promises;
const path = require('path');

class ImageService {
    constructor(config) {
        this.uploadDir = config.uploadDir || path.join(__dirname, '../../public/uploads');
    }

    async initialize() {
        try {
            await fs.mkdir(this.uploadDir, { recursive: true });
            console.log('Upload directory initialized:', this.uploadDir);
        } catch (error) {
            throw new Error(`Failed to initialize upload directory: ${error.message}`);
        }
    }

    async saveImage(base64Data) {
        try {
            console.log('Receiving image data...');
            const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                console.error('Invalid base64 data format');
                throw new Error('Invalid base64 data');
            }

            console.log('Converting base64 to buffer...');
            const imageBuffer = Buffer.from(matches[2], 'base64');
            const fileName = `network-${Date.now()}.png`;
            const filePath = path.join(this.uploadDir, fileName);

            console.log('Saving file to:', filePath);
            await fs.writeFile(filePath, imageBuffer);

            console.log('File saved successfully');
            return `/uploads/${fileName}`;
        } catch (error) {
            console.error('Error saving image:', error);
            throw error;
        }
    }
}

module.exports = ImageService;