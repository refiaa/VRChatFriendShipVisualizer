class MetadataController {
    constructor(metadataService) {
        this.metadataService = metadataService;
        this.isGenerating = false;
    }

    updateConfig(config) {
        this.metadataService.updateConfig(config);
    }

    async generateMetadata(progressCallback) {
        try {
            this.isGenerating = true;
            await this.metadataService.initialize();
            const results = await this.metadataService.processDirectory(progressCallback);

            return {
                total: results.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                details: results
            };
        } catch (error) {
            if (error.message === 'Generation stopped') {
                await this.metadataService.clearMetadataDirectory();
                return {
                    stopped: true
                };
            }
            console.error('Error generating metadata:', error);
            throw error;
        } finally {
            this.isGenerating = false;
        }
    }

    async stopGeneration() {
        if (this.isGenerating) {
            this.metadataService.stopProcessing = true;
        }
    }
}

module.exports = MetadataController;