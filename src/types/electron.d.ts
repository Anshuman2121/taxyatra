export interface ElectronAPI {
  checkActivation: () => Promise<{ success: boolean; message?: string; license?: any }>;
  validateActivationCode: (code: string) => Promise<{ success: boolean; message?: string; license?: any }>;
  savePanCredentials: (pan: string, password: string) => Promise<{ success: boolean; message?: string }>;
  getPanCredentials: () => Promise<any[]>;
  getPanWithPassword: (pan: string) => Promise<any>;
  fetchUserProfile: (pan: string, password: string, save?: boolean) => Promise<{ success: boolean; message?: string; data?: any; returnId?: string }>;
  saveFetchedProfile: (data: any) => Promise<any>;
  getUserData: (pan: string) => Promise<{ success: boolean; data?: any; message?: string }>;
  getAllUsers: () => Promise<{ success: boolean; data?: any[]; message?: string }>;
  deleteUser: (pan: string) => Promise<{ success: boolean; message?: string }>;
  updateUserDetails: (data: any) => Promise<{ success: boolean; message?: string }>;
  onFetchProgress: (callback: (event: any, status: string) => void) => void;
  removeAllFetchProgressListeners: () => void;
  // Registration API
  checkRegistration: () => Promise<any>;
  submitRegistration: (licenseKey: string) => Promise<any>;
  getMachineId: () => Promise<string>;
  getLicenseDetails: () => Promise<any>;
  revokeLicense: () => Promise<any>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
