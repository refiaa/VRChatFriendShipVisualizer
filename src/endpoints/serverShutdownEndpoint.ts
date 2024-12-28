import type { Request, Response } from "express";

export class ServerShutdownEndpoint {
    constructor(private server: any) {}

    async handle(req: Request, res: Response): Promise<void> {
        try {
            res.json({ success: true, message: "Server shutdown initiated" });

            setTimeout(() => {
                this.server.close(() => {
                    process.exit(0);
                });
            }, 1000);

        } catch (error) {
            console.error("Error in ServerShutdownEndpoint:", error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
}