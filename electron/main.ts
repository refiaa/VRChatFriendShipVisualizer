import { app as electronApp, BrowserWindow } from 'electron';
import * as path from 'path';
import { server } from '../src/app';

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    getServerPort()
        .then((port) => {
            mainWindow!.loadURL(`http://localhost:${port}`);
        })
        .catch((error) => {
            console.error("Failed to get server port:", error);
        });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function getServerPort(): Promise<number> {
    return new Promise((resolve, reject) => {
        if (server.listening) {
            const address = server.address();
            if (address && typeof address === "object") {
                resolve(address.port);
            } else {
                reject(new Error("Server address is not an object"));
            }
        } else {
            server.on("listening", () => {
                const address = server.address();
                if (address && typeof address === "object") {
                    resolve(address.port);
                } else {
                    reject(new Error("Server address is not an object"));
                }
            });
        }
    });
}

electronApp.whenReady().then(() => {
    createMainWindow();
    electronApp.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

electronApp.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        server.close(() => {
            electronApp.quit();
        });
    }
});
