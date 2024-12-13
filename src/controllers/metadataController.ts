import type { MetadataService } from "../services/metadataService";
import type { Config, ProgressCallback } from "../types";

export class MetadataController {
  private isGenerating = false;

  constructor(private metadataService: MetadataService) {}

  updateConfig(config: Partial<Config>): void {
    this.metadataService.updateConfig(config);
  }

  async generateMetadata(progressCallback: ProgressCallback): Promise<{
    total?: number;
    successful?: number;
    failed?: number;
    details?: any[];
    stopped?: boolean;
  }> {
    try {
      this.isGenerating = true;
      await this.metadataService.initialize();
      const results = await this.metadataService.processDirectory(progressCallback);

      return {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        details: results,
      };
    } catch (error) {
      if (error instanceof Error && error.message === "Generation stopped") {
        await this.metadataService.clearMetadataDirectory();
        return {
          stopped: true,
        };
      }
      console.error("Error generating metadata:", error);
      throw error;
    } finally {
      this.isGenerating = false;
    }
  }

  async stopGeneration(): Promise<void> {
    if (this.isGenerating) {
      this.metadataService.stopProcessing = true;
    }
  }
}
