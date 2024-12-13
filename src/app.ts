import path from "path";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { ImageController } from "./controllers/imageController";
import { MetadataController } from "./controllers/metadataController";
import { createRouter } from "./routes/apiRoutes";
import { ImageService } from "./services/imageService";
import { MetadataService } from "./services/metadataService";
import type { Config } from "./types";

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

app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "../public")));

app.use("/icon", express.static(path.join(__dirname, "../icon")));

// Router設定
const apiRouter = createRouter(metadataController, imageController);
app.use("/api", apiRouter);

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
