import { AuthRepository } from '../database/repositories/auth.repository';
import { getDatabase } from '../database/connection';

class AuthService {
  private authRepository: AuthRepository | null = null;

  async initialize(): Promise<void> {
    this.authRepository = new AuthRepository(getDatabase());
    await this.authRepository.createTables();
  }

  private ensureRepository(): AuthRepository {
    if (!this.authRepository) {
      throw new Error('AuthService not initialized');
    }
    return this.authRepository;
  }

  async isAppActivated(): Promise<boolean> {
    return this.ensureRepository().isActivated();
  }

  async validateAndStoreActivationCode(code: string): Promise<boolean> {
    if (code && code.length > 0) {
      await this.ensureRepository().saveActivationCode(code);
      return true;
    }
    return false;
  }

  async savePanCredentials(pan: string, password: string): Promise<boolean> {
    try {
      await this.ensureRepository().savePanCredentials(pan, password);
      return true;
    } catch (error) {
      console.error('Error saving PAN credentials:', error);
      return false;
    }
  }

  async getPanCredentials() {
    return this.ensureRepository().getAllPanCredentials();
  }

  async getPanWithPassword(pan: string) {
    return this.ensureRepository().getPanWithPassword(pan);
  }
}

export default new AuthService();
