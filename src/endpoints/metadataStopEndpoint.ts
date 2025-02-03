import type { Request, Response } from "express";
import type { MetadataController } from "../controllers/metadataController";

export class MetadataStopEndpoint {
  constructor(private metadataController: MetadataController) {}

  async handle(_req: Request, res: Response): Promise<void> {
    try {
      await this.metadataController.stopGeneration();
      res.json({ success: true });
    } catch (error) {
      throw error;
    }
  }
}
