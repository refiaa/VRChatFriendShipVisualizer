class MetadataController {
    constructor(metadataService) {
        this.metadataService = metadataService;
    }

    async generateMetadata(req, res) {
        try {
            await this.metadataService.initialize();
            const results = await this.metadataService.processDirectory();

            const summary = {
                total: results.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                details: results
            };

            res.json(summary);
        } catch (error) {
            console.error('Error generating metadata:', error);
            res.status(500).json({
                error: 'Failed to generate metadata',
                details: error.message
            });
        }
    }
}

module.exports = MetadataController;