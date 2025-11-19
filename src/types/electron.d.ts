export interface ElectronAPI {
  checkActivation: () => Promise<boolean>;
  validateActivationCode: (code: string) => Promise<boolean>;
  savePanCredentials: (pan: string, password: string) => Promise<boolean>;
  getPanCredentials: () => Promise<Array<{pan: string; created_at: string}>>;
  getPanWithPassword: (pan: string) => Promise<{pan: string; password: string} | null>;
  fetchUserProfile: (pan: string, password: string) => Promise<{success: boolean; data?: any; message?: string}>;
  getUserData: (pan: string) => Promise<{success: boolean; data?: any; message?: string}>;
  onFetchProgress: (callback: (event: any, status: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
