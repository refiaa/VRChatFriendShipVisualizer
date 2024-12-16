import type { Request, Response } from "express";
import type { ImageController } from "../controllers/imageController";

export class ImageUploadEndpoint {
    constructor(private imageController: ImageController) {}

    async handle(req: Request, res: Response): Promise<void> {
        try {
            await this.imageController.uploadImage(req, res);
        } catch (error) {
            throw error;
        }
    }
}