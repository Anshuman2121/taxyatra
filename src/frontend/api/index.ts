export const api = {
    checkActivation: () => window.electronAPI.checkActivation(),
    validateActivationCode: (code: string) => window.electronAPI.validateActivationCode(code),
    savePanCredentials: (pan: string, password: string) => window.electronAPI.savePanCredentials(pan, password),
    getPanCredentials: () => window.electronAPI.getPanCredentials(),
    getPanWithPassword: (pan: string) => window.electronAPI.getPanWithPassword(pan),
    fetchUserProfile: (pan: string, password: string) => window.electronAPI.fetchUserProfile(pan, password),
    getUserData: (pan: string) => window.electronAPI.getUserData(pan)
};
