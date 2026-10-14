import type { Request, Response } from "express";
import type { FileStorageService } from "../services/fileStorageService";

export class MetadataFileEndpoint {
  constructor(private fileStorageService: FileStorageService) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const param = req.params["filename"]!;
      const filename: string = Array.isArray(param) ? param.join("/") : param;
      const data = await this.fileStorageService.readMetadataFile(filename);
      res.json(data);
    } catch (error) {
      console.error("Error in MetadataFileEndpoint:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
