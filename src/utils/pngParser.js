const fs = require('fs').promises;
const path = require('path');

class PNGParser {
    constructor(filePath) {
        this.filePath = filePath;
    }

    async parse() {
        try {
            const data = await fs.readFile(this.filePath);
            return this.extractMetadata(data);
        } catch (error) {
            throw new Error(`Failed to parse PNG file: ${error.message}`);
        }
    }

    extractMetadata(data) {
        if (!this.isPNG(data)) {
            throw new Error('Invalid PNG format');
        }

        const chunks = this.parseChunks(data);
        const iTXtChunk = chunks.find(chunk => chunk.type === 'iTXt');

        if (!iTXtChunk) {
            return {
                timestamp: new Date().toISOString(),
                filename: path.basename(this.filePath),
                metadata: {}
            };
        }

        try {
            const metadata = this.parseITXtChunk(iTXtChunk.data);
            return {
                ...JSON.parse(metadata),
                timestamp: new Date().toISOString(),
                filename: path.basename(this.filePath)
            };
        } catch (error) {
            console.error('Raw iTXt chunk data:', iTXtChunk.data.toString('utf-8'));
            throw new Error(`Failed to parse metadata: ${error.message}`);
        }
    }

    isPNG(data) {
        const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
        return data.slice(0, 8).equals(signature);
    }

    parseChunks(data) {
        const chunks = [];
        let offset = 8;

        while (offset < data.length) {
            const length = data.readUInt32BE(offset);
            const type = data.toString('ascii', offset + 4, offset + 8);
            const chunkData = data.slice(offset + 8, offset + 8 + length);
            const crc = data.readUInt32BE(offset + 8 + length);

            chunks.push({
                length,
                type,
                data: chunkData,
                crc
            });

            offset += 12 + length;
            if (type === 'IEND') break;
        }

        return chunks;
    }

    parseITXtChunk(data) {
        // Keyword + null byte +
        // Compression flag (1 byte) +
        // Compression method (1 byte) +
        // Language tag + null byte +
        // Translated keyword + null byte +
        // Text

        let pos = 0;

        while (data[pos] !== 0) pos++;
        pos++; // Skip null byte

        pos += 2;

        while (data[pos] !== 0) pos++;
        pos++; // Skip null byte

        while (data[pos] !== 0) pos++;
        pos++; // Skip null byte

        const textData = data.slice(pos);
        return textData.toString('utf-8');
    }
}

module.exports = PNGParser;