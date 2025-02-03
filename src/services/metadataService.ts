import { promises as fs } from "fs";
import path from "path";
import type { Config, MetadataResult, ProgressCallback } from "../types";
import { PNGParser } from "../utils/pngParser";

interface PngFile {
  fullPath: string;
  relativePath: string;
}

export class MetadataService {
  private imgDir: string;
  private metadataDir: string;
  public stopProcessing = false;

  constructor(config: Config) {
    if (!config.imgDir || !config.metadataDir) {
      throw new Error("Required configuration missing");
    }
    this.imgDir = config.imgDir;
    this.metadataDir = config.metadataDir;
  }

  updateConfig(config: Partial<Config>): void {
    if (config.imgDir) {
      this.imgDir = config.imgDir;
    }
    if (config.metadataDir) {
      this.metadataDir = config.metadataDir;
    }
  }

  async initialize(): Promise<void> {
    try {
      let exists = false;
      try {
        await fs.access(this.metadataDir);
        exists = true;
      } catch (e) {
        exists = false;
      }

      if (exists) {
        const stats = await fs.stat(this.metadataDir);
        if (!stats.isDirectory()) {
          try {
            await fs.unlink(this.metadataDir);
            console.log(`Existing file at metadataDir was removed: ${this.metadataDir}`);
          } catch (unlinkError) {
            throw new Error(`Unable to remove file at metadataDir: ${unlinkError instanceof Error ? unlinkError.message : "Unknown error"}`);
          }
        } else {
          await this.clearMetadataDirectory();
        }
      }
      await fs.mkdir(this.metadataDir, { recursive: true });
      console.log("Metadata directory initialized:", this.metadataDir);
    } catch (error) {
      throw new Error(
          `Failed to initialize metadata directory: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async clearMetadataDirectory(): Promise<void> {
    try {
      const exists = await fs
          .access(this.metadataDir)
          .then(() => true)
          .catch(() => false);

      if (exists) {
        const deleteRecursive = async (dirPath: string): Promise<void> => {
          const items = await fs.readdir(dirPath, { withFileTypes: true });
          for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            if (item.isDirectory()) {
              await deleteRecursive(fullPath);
            } else {
              await fs.unlink(fullPath);
            }
          }
          await fs.rmdir(dirPath);
        };

        await deleteRecursive(this.metadataDir);
        console.log("Existing metadata directory cleared");
      }
    } catch (error) {
      console.error("Error clearing metadata directory:", error);
      throw error;
    }
  }

  async findPNGFiles(directory: string): Promise<PngFile[]> {
    console.log("Scanning directory:", directory);
    let pngFiles: PngFile[] = [];

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          console.log("Found subdirectory:", fullPath);
          const subDirFiles = await this.findPNGFiles(fullPath);
          pngFiles = pngFiles.concat(subDirFiles);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
          console.log("Found PNG file:", fullPath);
          const relativePath = path.relative(this.imgDir, fullPath);
          pngFiles.push({ fullPath, relativePath });
        }
      }
    } catch (error) {
      console.error("Error scanning directory:", error);
    }

    return pngFiles;
  }

  async processImage(imagePath: string): Promise<{ originalPath: string; metadata: any }> {
    try {
      console.log("Processing image:", imagePath);
      const parser = new PNGParser(imagePath);
      const metadata = await parser.parse();

      const relativePath = path.relative(this.imgDir, imagePath);
      const relativeDir = path.dirname(relativePath);
      const fileName = path.basename(imagePath, ".png") + ".json";
      const outputDir = path.join(this.metadataDir, relativeDir);
      const outputPath = path.join(outputDir, fileName);

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, JSON.stringify(metadata, null, 2), "utf-8");
      console.log("Saved metadata to:", outputPath);

      return { originalPath: imagePath, metadata };
    } catch (error) {
      throw new Error(
          `Failed to process image ${path.basename(imagePath)}: ${
              error instanceof Error ? error.message : "Unknown error"
          }`
      );
    }
  }

  async processDirectory(progressCallback: ProgressCallback): Promise<MetadataResult[]> {
    try {
      this.stopProcessing = false;
      console.log("Starting directory scan at:", this.imgDir);
      const pngFiles = await this.findPNGFiles(this.imgDir);
      const totalFiles = pngFiles.length;
      console.log(`Found ${totalFiles} PNG files in total`);

      progressCallback({ type: "start", total: totalFiles });

      const results: MetadataResult[] = [];
      for (let i = 0; i < pngFiles.length; i++) {
        if (this.stopProcessing) {
          throw new Error("Generation stopped");
        }

        const file = pngFiles[i];
        if (!file) continue;
        try {
          console.log(`Processing file (${i + 1}/${totalFiles}): ${file.relativePath}`);
          const result = await this.processImage(file.fullPath);
          results.push({
            file: file.relativePath,
            success: true,
            metadata: result.metadata,
          });

          progressCallback({
            type: "progress",
            current: i + 1,
            total: totalFiles,
            file: file.relativePath,
          });
        } catch (error) {
          if (this.stopProcessing) {
            throw new Error("Generation stopped");
          }

          console.error(`Error processing ${file.relativePath}:`, error);
          results.push({
            file: file.relativePath,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });

          progressCallback({
            type: "progress",
            current: i + 1,
            total: totalFiles,
            file: file.relativePath,
            error: true,
          });
        }
      }

      return results;
    } catch (error) {
      console.error("Error in processDirectory:", error);
      throw error;
    } finally {
      this.stopProcessing = false;
    }
  }
}
