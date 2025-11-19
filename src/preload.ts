// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  checkActivation: () => ipcRenderer.invoke('check-activation'),
  validateActivationCode: (code: string) => ipcRenderer.invoke('validate-activation-code', code),
  savePanCredentials: (pan: string, password: string) => ipcRenderer.invoke('save-pan-credentials', pan, password),
  getPanCredentials: () => ipcRenderer.invoke('get-pan-credentials'),
  getPanWithPassword: (pan: string) => ipcRenderer.invoke('get-pan-with-password', pan),
  fetchUserProfile: (pan: string, password: string) => ipcRenderer.invoke('fetch-user-profile', pan, password),
  getUserData: (pan: string) => ipcRenderer.invoke('get-user-data', pan),
  onFetchProgress: (callback: (event: any, status: string) => void) => ipcRenderer.on('fetch-progress', callback)
});
