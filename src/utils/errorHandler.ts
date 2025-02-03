import type { NextFunction, Request, Response } from "express";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  console.error("Global error handler caught:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err instanceof Error ? err.message : String(err),
  });
}
