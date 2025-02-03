import path from "path";
import express, { Request, Response } from "express";
import { ImageController } from "./controllers/imageController";
import { MetadataController } from "./controllers/metadataController";
import { createRouter } from "./routes/apiRoutes";
import { FileStorageService } from "./services/fileStorageService";
import { ImageService } from "./services/imageService";
import { MetadataService } from "./services/metadataService";
import type { Config } from "./types";
import { errorHandler } from "./utils/errorHandler";

const metadataDir: string = path.join(
    process.env["USERPROFILE"] || "",
    "Pictures",
    "VRChat",
    "metadata"
);

// 設定
const portEnv = process.env["ELECTRON_RUN_AS_NODE"] ? "0" : (process.env["PORT"] || "3000");
const PORT: number = Number.parseInt(portEnv, 10);

const config: Config = {
  imgDir: path.join(process.env["USERPROFILE"] || "", "Pictures", "VRChat"),
  metadataDir,
  uploadDir: path.join(__dirname, "../public/uploads")
};

const app = express();

// ServiceとControllerの初期化
const metadataService = new MetadataService(config);
const metadataController = new MetadataController(metadataService);
const imageService = new ImageService();
const imageController = new ImageController(imageService);
const fileStorageService = new FileStorageService(config.metadataDir);

app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "../public")));
app.use("/icon", express.static(path.join(__dirname, "../icon")));

// Router設定
const server = app.listen(PORT, () => {
  const address = server.address();
  if (address && typeof address === "object") {
    console.log(`Server is running on port ${address.port}`);
  } else {
    console.log(`Server is running on port ${PORT}`);
  }
});

const apiRouter = createRouter(metadataController, imageController, fileStorageService, server); // Pass server instance
app.use("/api", apiRouter);

app.get("/", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.use(errorHandler);

export { app, server };
