import type { Request, Response } from "express";
import type { FileStorageService } from "../services/fileStorageService";

export class MetadataFilterEndpoint {
  constructor(private fileStorageService: FileStorageService) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.body as { startDate: string; endDate: string };
      const filteredFiles = await this.fileStorageService.filterMetadataFilesByDate(startDate, endDate);
      res.json(filteredFiles);
    } catch (error) {
      console.error("Error in MetadataFilterEndpoint:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
