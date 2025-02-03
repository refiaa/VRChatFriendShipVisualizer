import FormData from "form-data";
import fetch from "node-fetch";

export class ImageService {
  private UPLOAD_URL = "https://tmpfiles.org/api/v1/upload";

  async saveImage(base64Data: string): Promise<string> {
    try {
      console.log("Receiving image data...");
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error("Invalid base64 data");
      }
      const base64String = matches[2]!;
      const buffer = Buffer.from(base64String, "base64");

      const formData = new FormData();
      formData.append("file", buffer, {
        filename: "network.png",
        contentType: "image/png",
      });

      console.log("Uploading to tmpfiles.org...");
      const response = await fetch(this.UPLOAD_URL, {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", response.status);
      const result = await response.json();
      console.log("Response:", result);

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText} (${response.status})`);
      }

      if (!result.data || !result.data.url) {
        throw new Error("Invalid response from server");
      }

      const viewUrl = result.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
      console.log("Upload successful:", viewUrl);
      return viewUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  }
}
