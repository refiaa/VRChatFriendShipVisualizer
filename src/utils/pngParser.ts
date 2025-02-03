import { promises as fs } from "fs";
import path from "path";
import type { PNGChunk } from "../types";

export class PNGParser {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async parse(): Promise<any> {
    try {
      const data = await fs.readFile(this.filePath);
      return this.extractMetadata(data);
    } catch (error) {
      throw new Error(
          `Failed to parse PNG file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private extractMetadata(data: Buffer): any {
    if (!this.isPNG(data)) {
      throw new Error("Invalid PNG format");
    }

    const chunks = this.parseChunks(data);
    const iTXtChunk = chunks.find((chunk) => chunk.type === "iTXt");

    if (!iTXtChunk) {
      return {
        timestamp: new Date().toISOString(),
        filename: path.basename(this.filePath),
        metadata: {},
      };
    }

    try {
      const metadata = this.parseITXtChunk(iTXtChunk.data);
      return {
        ...JSON.parse(metadata),
        timestamp: new Date().toISOString(),
        filename: path.basename(this.filePath),
      };
    } catch (error) {
      console.error("Raw iTXt chunk data:", iTXtChunk.data.toString("utf-8"));
      throw new Error(
          `Failed to parse metadata: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private isPNG(data: Buffer): boolean {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    return data.slice(0, 8).equals(signature);
  }

  private parseChunks(data: Buffer): PNGChunk[] {
    const chunks: PNGChunk[] = [];
    let offset = 8;

    while (offset < data.length) {
      const length = data.readUInt32BE(offset);
      const type = data.toString("ascii", offset + 4, offset + 8);
      const chunkData = data.slice(offset + 8, offset + 8 + length);
      const crc = data.readUInt32BE(offset + 8 + length);
      chunks.push({ length, type, data: chunkData, crc });
      offset += 12 + length;
      if (type === "IEND") break;
    }

    return chunks;
  }

  private parseITXtChunk(data: Buffer): string {
    let pos = 0;

    while (data[pos] !== 0) pos++;
    pos++;

    pos += 2;

    while (data[pos] !== 0) pos++;
    pos++;

    while (data[pos] !== 0) pos++;
    pos++;

    const textData = data.slice(pos);
    return textData.toString("utf-8");
  }
}
