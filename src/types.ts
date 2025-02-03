export interface Config {
  imgDir: string;
  metadataDir: string;
  uploadDir?: string;
}

export interface ImageData {
  imageData: string;
}

export interface MetadataResult {
  file: string;
  success: boolean;
  metadata?: any;
  error?: string;
}

interface ProgressStart {
  type: "start";
  total: number;
}

interface ProgressUpdate {
  type: "progress";
  current: number;
  total: number;
  file: string;
  error?: boolean;
}

interface ProgressComplete {
  type: "complete";
  total?: number;
  successful?: number;
  failed?: number;
  details?: any[];
  stopped?: boolean;
}

export type ProgressData = ProgressStart | ProgressUpdate | ProgressComplete;
export type ProgressCallback = (progress: ProgressData) => void;

export interface PNGChunk {
  length: number;
  type: string;
  data: Buffer;
  crc: number;
}
