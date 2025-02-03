import type { Request, Response } from "express";
import type { FileStorageService } from "../services/fileStorageService";

export class MetadataDateRangeEndpoint {
  constructor(private fileStorageService: FileStorageService) {}

  async handle(_req: Request, res: Response): Promise<void> {
    try {
      const dateRange = await this.fileStorageService.getMetadataDateRange();
      res.json(dateRange);
    } catch (error) {
      console.error("Error in MetadataDateRangeEndpoint:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
