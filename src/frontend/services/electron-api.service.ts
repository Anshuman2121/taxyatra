import { IPC_CHANNELS } from '../../shared/constants';

class ElectronApiService {
  private get api() {
    return window.electronAPI;
  }

  async checkActivation(): Promise<boolean> {
    return this.api.checkActivation();
  }

  async validateActivationCode(code: string): Promise<boolean> {
    return this.api.validateActivationCode(code);
  }

  async savePanCredentials(pan: string, password: string): Promise<boolean> {
    return this.api.savePanCredentials(pan, password);
  }

  async getPanCredentials(): Promise<Array<{ pan: string; created_at: string }>> {
    return this.api.getPanCredentials();
  }

  async getPanWithPassword(pan: string): Promise<{ pan: string; password: string } | null> {
    return this.api.getPanWithPassword(pan);
  }

  async fetchUserProfile(pan: string, password: string): Promise<any> {
    return this.api.fetchUserProfile(pan, password);
  }

  async getUserData(pan: string): Promise<any> {
    return this.api.getUserData(pan);
  }
}

export default new ElectronApiService();
