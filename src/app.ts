import path from "path";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { ImageController } from "./controllers/imageController";
import { MetadataController } from "./controllers/metadataController";
import { createRouter } from "./routes/apiRoutes";
import { FileStorageService } from "./services/fileStorageService";
import { ImageService } from "./services/imageService";
import { MetadataService } from "./services/metadataService";
import type { Config } from "./types";
import { errorHandler } from "./utils/errorHandler";

const app: Express = express();
const PORT: number = Number.parseInt(process.env.PORT || "3000", 10);

// 設定
const config: Config = {
  imgDir: path.join(__dirname, "../icon"),
  metadataDir: path.join(__dirname, "../data/metadata"),
  uploadDir: path.join(__dirname, "../public/uploads"),
};

// ServiceとControllerの初期化
const metadataService = new MetadataService(config);
const metadataController = new MetadataController(metadataService);
const imageService = new ImageService();
const imageController = new ImageController(imageService);
const fileStorageService = new FileStorageService(config.metadataDir); // Initialize FileStorageService

app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "../public")));
app.use("/icon", express.static(path.join(__dirname, "../icon")));

// Router設定
const apiRouter = createRouter(metadataController, imageController, fileStorageService); // Pass FileStorageService
app.use("/api", apiRouter);

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
