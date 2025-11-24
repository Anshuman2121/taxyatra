// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  checkActivation: () => ipcRenderer.invoke('check-activation'),
  validateActivationCode: (code: string) => ipcRenderer.invoke('validate-activation-code', code),
  savePanCredentials: (pan: string, password: string) => ipcRenderer.invoke('save-pan-credentials', pan, password),
  getPanCredentials: () => ipcRenderer.invoke('get-pan-credentials'),
  getPanWithPassword: (pan: string) => ipcRenderer.invoke('get-pan-with-password', pan),
  fetchUserProfile: (pan: string, password: string, save?: boolean) => ipcRenderer.invoke('fetch-user-profile', pan, password, save),
  saveFetchedProfile: (data: any) => ipcRenderer.invoke('save-fetched-profile', data),
  getUserData: (pan: string) => ipcRenderer.invoke('get-user-data', pan),
  getAllUsers: () => ipcRenderer.invoke('get-all-users'),
  deleteUser: (pan: string) => ipcRenderer.invoke('delete-user', pan),
  updateUserDetails: (data: any) => ipcRenderer.invoke('update-user-details', data),
  onFetchProgress: (callback: (event: any, status: string) => void) => ipcRenderer.on('fetch-progress', callback),
  removeAllFetchProgressListeners: () => ipcRenderer.removeAllListeners('fetch-progress'),
  // Registration API
  checkRegistration: () => ipcRenderer.invoke('registration:check'),
  submitRegistration: (licenseKey: string) => ipcRenderer.invoke('registration:submit', licenseKey),
  getMachineId: () => ipcRenderer.invoke('registration:machine-id'),
  getLicenseDetails: () => ipcRenderer.invoke('registration:details'),
  revokeLicense: () => ipcRenderer.invoke('registration:revoke'),
  // Download API
  download26AS: (pan: string, password: string, assessmentYear: string) => ipcRenderer.invoke('download:26as', pan, password, assessmentYear),
  downloadAIS: (pan: string, password: string) => ipcRenderer.invoke('download:ais', pan, password),
  getDownloadPath: (pan: string) => ipcRenderer.invoke('download:get-path', pan),
  // Captcha dialog events
  onCaptchaRequired: (callback: (event: any, data: { image: string }) => void) => ipcRenderer.on('download:captcha-required', callback),
  sendCaptchaResponse: (text: string, cancelled: boolean) => ipcRenderer.send('download:captcha-response', { text, cancelled }),
  removeAllCaptchaListeners: () => ipcRenderer.removeAllListeners('download:captcha-required')
});
