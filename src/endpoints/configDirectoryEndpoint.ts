import { promises as fs } from "fs";
import path from "path";
import type { Request, Response } from "express";
import type { MetadataController } from "../controllers/metadataController";

export class ConfigDirectoryEndpoint {
  constructor(private metadataController: MetadataController) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { directory } = req.body as { directory?: string };
      const absolutePath = directory
          ? path.resolve(directory)
          : path.join(process.env["USERPROFILE"] || "", "Pictures", "VRChat");

      const stats = await fs.stat(absolutePath);
      if (!stats.isDirectory()) {
        res.status(400).json({ success: false, error: "Not a directory" });
        return;
      }

      await fs.access(absolutePath, fs.constants.R_OK);
      this.metadataController.updateConfig({ imgDir: absolutePath });
      res.json({ success: true, directory: absolutePath });
    } catch (error) {
      console.error("Error in ConfigDirectoryEndpoint:", error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
