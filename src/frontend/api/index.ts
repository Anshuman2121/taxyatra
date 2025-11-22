export const api = {
    checkActivation: () => window.electronAPI.checkActivation(),
    validateActivationCode: (code: string) => window.electronAPI.validateActivationCode(code),
    savePanCredentials: (pan: string, password: string) => window.electronAPI.savePanCredentials(pan, password),
    getPanCredentials: () => window.electronAPI.getPanCredentials(),
    getPanWithPassword: (pan: string) => window.electronAPI.getPanWithPassword(pan),
    fetchUserProfile: (pan: string, password: string, save?: boolean) => window.electronAPI.fetchUserProfile(pan, password, save),
    saveFetchedProfile: (data: any) => window.electronAPI.saveFetchedProfile(data),
    getUserData: (pan: string) => window.electronAPI.getUserData(pan),
    getAllUsers: () => window.electronAPI.getAllUsers(),
    deleteUser: (pan: string) => window.electronAPI.deleteUser(pan),
    updateUserDetails: (data: any) => window.electronAPI.updateUserDetails(data)
};
