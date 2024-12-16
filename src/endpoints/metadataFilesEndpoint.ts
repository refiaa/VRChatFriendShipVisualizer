import type { Request, Response } from "express";
import type { FileStorageService } from "../services/fileStorageService";

export class MetadataFilesEndpoint {
  constructor(private fileStorageService: FileStorageService) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const files = await this.fileStorageService.getAllMetadataFiles();
      res.json(files);
    } catch (error) {
      console.error("Error in MetadataFilesEndpoint:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
