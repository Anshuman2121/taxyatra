export interface DownloadOptions {
    pan: string;
    password: string;
    year: string;
    downloadPath: string;
    event: Electron.IpcMainInvokeEvent;
    onProgress?: (status: string) => void;
}

export interface DownloadResponse {
    success: boolean;
    filePath?: string;
    message?: string;
}

export type ProgressCallback = (status: string) => void;
