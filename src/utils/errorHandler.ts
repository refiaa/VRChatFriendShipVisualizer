import { type Request, type Response, type NextFunction } from "express";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
    console.error("Global error handler caught:", err);
    res.status(500).json({
        error: "Internal server error",
        message: err instanceof Error ? err.message : String(err),
    });
}