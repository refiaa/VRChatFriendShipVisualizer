import type { Request, Response } from "express";
import type { ImageService } from "../services/imageService";

export class ImageController {
  constructor(private imageService: ImageService) {}

  async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      const { imageData } = req.body;
      if (!imageData) {
        throw new Error("No image data provided");
      }

      const imageUrl = await this.imageService.saveImage(imageData);
      res.json({ success: true, url: imageUrl });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
