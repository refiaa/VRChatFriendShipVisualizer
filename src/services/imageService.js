// tmpfilesを利用しています。

class ImageService {
    constructor() {
        this.UPLOAD_URL = 'https://tmpfiles.org/api/v1/upload';
    }

    async saveImage(base64Data) {
        try {
            console.log('Receiving image data...');
            const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                throw new Error('Invalid base64 data');
            }

            const binaryData = atob(matches[2]);
            const uint8Array = new Uint8Array(binaryData.length);
            for (let i = 0; i < binaryData.length; i++) {
                uint8Array[i] = binaryData.charCodeAt(i);
            }
            const blob = new Blob([uint8Array], { type: 'image/png' });

            const formData = new FormData();
            formData.append('file', blob, 'network.png');

            console.log('Uploading to tmpfiles.org...');
            const response = await fetch(this.UPLOAD_URL, {
                method: 'POST',
                body: formData
            });

            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('Response:', result);

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText} (${response.status})`);
            }

            if (!result.data || !result.data.url) {
                throw new Error('Invalid response from server');
            }

            const viewUrl = result.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            console.log('Upload successful:', viewUrl);
            return viewUrl;

        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }
}

module.exports = ImageService;