class ImageController {
    constructor(imageService) {
        this.imageService = imageService;
    }

    async uploadImage(req, res) {
        try {
            const { imageData } = req.body;
            if (!imageData) {
                throw new Error('No image data provided');
            }

            const imageUrl = await this.imageService.saveImage(imageData);
            res.json({ success: true, url: imageUrl });
        } catch (error) {
            console.error('Error uploading image:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = ImageController;