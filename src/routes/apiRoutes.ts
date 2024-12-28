import { promises as fs } from "fs";
import path from "path";
import { type NextFunction, type Request, type Response, Router } from "express";
import type { ImageController } from "../controllers/imageController";
import type { MetadataController } from "../controllers/metadataController";
import { ConfigDirectoryEndpoint } from "../endpoints/configDirectoryEndpoint";
import { ImageUploadEndpoint } from "../endpoints/imageUploadEndpoint";
import { MetadataDateRangeEndpoint } from "../endpoints/metadataDateRangeEndpoint";
import { MetadataFileEndpoint } from "../endpoints/metadataFileEndpoint";
import { MetadataFilesEndpoint } from "../endpoints/metadataFilesEndpoint";
import { MetadataFilterEndpoint } from "../endpoints/metadataFilterEndpoint";
import { MetadataGenerationEndpoint } from "../endpoints/metadataGenerationEndpoint";
import { MetadataStopEndpoint } from "../endpoints/metadataStopEndpoint";
import { ServerShutdownEndpoint } from "../endpoints/serverShutdownEndpoint";
import type { FileStorageService } from "../services/fileStorageService";

export function createRouter(
  metadataController: MetadataController,
  imageController: ImageController,
  fileStorageService: FileStorageService,
  server: any,
): Router {
  const router: Router = Router();

  const imageUploadEndpoint = new ImageUploadEndpoint(imageController);
  const metadataGenerationEndpoint = new MetadataGenerationEndpoint(metadataController);
  const metadataStopEndpoint = new MetadataStopEndpoint(metadataController);
  const configDirectoryEndpoint = new ConfigDirectoryEndpoint(metadataController);
  const metadataFilesEndpoint = new MetadataFilesEndpoint(fileStorageService);
  const metadataFileEndpoint = new MetadataFileEndpoint(fileStorageService);
  const metadataDateRangeEndpoint = new MetadataDateRangeEndpoint(fileStorageService);
  const metadataFilterEndpoint = new MetadataFilterEndpoint(fileStorageService);
  const serverShutdownEndpoint = new ServerShutdownEndpoint(server);

  /**
   * POST /config/directory
   * Sets the working directory for image processing
   */
  router.post("/config/directory", (req: Request, res: Response, next: NextFunction) =>
    configDirectoryEndpoint.handle(req, res).catch(next),
  );

  /**
   * GET /metadata/date-range
   * Retrieves the date range of available metadata files
   */
  router.get("/metadata/date-range", (req: Request, res: Response, next: NextFunction) =>
      metadataDateRangeEndpoint.handle(req, res).catch(next),
  );

  /**
   * GET /metadata/generate
   * Initiates metadata generation process with SSE progress updates
   */
  router.get("/metadata/generate", (req: Request, res: Response, next: NextFunction) =>
      metadataGenerationEndpoint.handle(res).catch(next),
  );

  /**
   * GET /metadata/files
   * Lists all available metadata files
   */
  router.get("/metadata/files", (req: Request, res: Response, next: NextFunction) =>
    metadataFilesEndpoint.handle(req, res).catch(next),
  );

  /**
   * GET /metadata/file/:filename(*)
   * Retrieves content of a specific metadata file
   */
  router.get("/metadata/file/:filename(*)", (req: Request, res: Response, next: NextFunction) =>
    metadataFileEndpoint.handle(req, res).catch(next),
  );

  /**
   * POST /metadata/filter
   * Filters metadata files by date range
   */
  router.post("/metadata/filter", (req: Request, res: Response, next: NextFunction) =>
      metadataFilterEndpoint.handle(req, res).catch(next),
  );

  /**
   * POST /metadata/stop
   * Stops ongoing metadata generation process
   */
  router.post("/metadata/stop", (req: Request, res: Response, next: NextFunction) =>
    metadataStopEndpoint.handle(req, res).catch(next),
  );

  /**
   * POST /upload/image
   * Handles image file upload and processing
   */
  router.post("/upload/image", (req: Request, res: Response, next: NextFunction) =>
    imageUploadEndpoint.handle(req, res).catch(next),
  );

  /**
   * POST /server/shutdown
   * Safely shuts down the server
   */
  router.post("/server/shutdown", (req: Request, res: Response, next: NextFunction) =>
      serverShutdownEndpoint.handle(req, res).catch(next),
  );

  /**
   * GET /version
   * Returns the application version from VERSION file
   */
  router.get("/version", async (req: Request, res: Response) => {
    try {
      const versionPath = path.join(__dirname, "../../VERSION");
      const version = await fs.readFile(versionPath, "utf-8");
      res.json({ version: version.trim() });
    } catch (error) {
      console.error("Error reading version:", error);
      res.json({ version: "0.0.0" });
    }
  });

  return router;
}