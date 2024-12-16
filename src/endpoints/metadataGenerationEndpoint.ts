import type { Response } from "express";
import type { MetadataController } from "../controllers/metadataController";
import type { ProgressCallback } from "../types";

export class MetadataGenerationEndpoint {
    constructor(private metadataController: MetadataController) {}

    async handle(res: Response): Promise<void> {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        try {
            const sendProgress: ProgressCallback = (progress) => {
                res.write(`data: ${JSON.stringify(progress)}\n\n`);
            };

            const result = await this.metadataController.generateMetadata(sendProgress);
            sendProgress({
                type: "complete",
                total: result.total,
                successful: result.successful,
                failed: result.failed,
                details: result.details,
                stopped: result.stopped,
            });
            res.end();
        } catch (error) {
            console.error("Error in MetadataGenerationEndpoint:", error);
            res.write(
                `data: ${JSON.stringify({
                    type: "error",
                    error: error instanceof Error ? error.message : "Unknown error",
                })}\n\n`,
            );
            res.end();
        }
    }
}