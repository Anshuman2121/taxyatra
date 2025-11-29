export interface LoginResponse {
    success: boolean;
    cookies?: any[];
    authToken?: string;
    message?: string;
}

export interface DownloadResponse {
    success: boolean;
    filePath?: string;
    message?: string;
}

export interface LogoutResponse {
    success: boolean;
    message?: string;
}

export type ProgressCallback = (status: string) => void;

export interface CookieData {
    name: string;
    value: string;
    domain: string;
    path: string;
    httpOnly?: boolean;
    secure?: boolean;
    expires?: number;
    sameSite?: 'Strict' | 'Lax' | 'None';
}
