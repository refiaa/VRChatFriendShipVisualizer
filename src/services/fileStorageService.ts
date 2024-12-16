import { promises as fs } from "fs";
import path from "path";

export class FileStorageService {
    private metadataDir: string;

    constructor(metadataDir: string) {
        this.metadataDir = metadataDir;
    }

    async getAllMetadataFiles(): Promise<string[]> {
        const getAllFiles = async (dir: string): Promise<string[]> => {
            const files = await fs.readdir(dir, { withFileTypes: true });
            const paths = await Promise.all(
                files.map(async (file) => {
                    const filePath = path.join(dir, file.name);
                    if (file.isDirectory()) {
                        return getAllFiles(filePath);
                    } else if (file.name.endsWith(".json")) {
                        return path.relative(this.metadataDir, filePath);
                    }
                    return null;
                }),
            );
            return paths.flat().filter((path): path is string => path !== null);
        };

        return getAllFiles(this.metadataDir);
    }

    async readMetadataFile(filename: string): Promise<any> {
        const filePath = path.join(this.metadataDir, filename);
        const data = await fs.readFile(filePath, "utf-8");
        return JSON.parse(data);
    }

    async getMetadataDateRange(): Promise<{
        exists: boolean;
        hasFiles?: boolean;
        hasValidDates?: boolean;
        start: string | null;
        end: string | null;
    }> {
        try {
            const metadataExists = await fs
                .access(this.metadataDir)
                .then(() => true)
                .catch(() => false);

            if (!metadataExists) {
                return { exists: false, start: null, end: null };
            }

            const files = await this.getAllMetadataFiles();
            if (files.length === 0) {
                return { exists: true, hasFiles: false, start: null, end: null };
            }

            const dates = files
                .map((filename) => {
                    const patterns = [
                        /VRChat_(\d{4}-\d{2})-\d{2}/,
                        /VRChat_\d+x\d+_(\d{4}-\d{2})-\d{2}/,
                    ];
                    for (const pattern of patterns) {
                        const match = filename.match(pattern);
                        if (match) {
                            return match[1];
                        }
                    }
                    return null;
                })
                .filter((date): date is string => date !== null);

            if (dates.length === 0) {
                return { exists: true, hasFiles: true, hasValidDates: false, start: null, end: null };
            }

            dates.sort();
            return { exists: true, hasFiles: true, hasValidDates: true, start: dates[0], end: dates[dates.length - 1] };
        } catch (error) {
            console.error("Error getting metadata date range:", error);
            return { exists: false, start: null, end: null };
        }
    }

    async filterMetadataFilesByDate(startDate: string, endDate: string): Promise<string[]> {
        const files = await this.getAllMetadataFiles();
        return files.filter((filename) => {
            const patterns = [
                /VRChat_(\d{4}-\d{2})-\d{2}/,
                /VRChat_\d+x\d+_(\d{4}-\d{2})-\d{2}/,
            ];
            for (const pattern of patterns) {
                const match = filename.match(pattern);
                if (match && match[1]) {
                    const fileDate = match[1];
                    return fileDate >= startDate && fileDate <= endDate;
                }
            }
            return false;
        });
    }
}