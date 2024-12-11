class MetadataController {
    constructor(metadataService) {
        this.metadataService = metadataService;
    }

    updateConfig(config) {
        this.metadataService.updateConfig(config);
    }

    async generateMetadata(progressCallback) {
        try {
            await this.metadataService.initialize();
            const results = await this.metadataService.processDirectory(progressCallback);

            return {
                total: results.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                details: results
            };
        } catch (error) {
            console.error('Error generating metadata:', error);
            throw error;
        }
    }
}

module.exports = MetadataController;