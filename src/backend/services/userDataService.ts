import ITRApiService from './api';
import { UserModel } from '../database/repositories/user.repository';
import { getDatabase } from '../database/connection';

class UserDataService {
  private userModel: UserModel | null = null;

  constructor() {
    this.userModel = new UserModel(getDatabase());
  }

  private ensureUserModel(): UserModel {
    if (!this.userModel) {
      throw new Error('UserDataService not initialized. Call initializeTables() first.');
    }
    return this.userModel;
  }

  async fetchAndSaveUserProfile(username: string, password: string, cookies?: any[]): Promise<void> {
    try {
      const prefillData = await ITRApiService.fetchAllUserData(username, password, cookies);
      console.log('Prefill data fetched successfully - displaying only, not saving');
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  async getUserData(pan: string) {
    try {
      const userModel = this.ensureUserModel();
      const [user, bankAccounts, jurisdiction] = await Promise.all([
        userModel.getUserByPan(pan),
        userModel.getBankAccountsByPan(pan),
        userModel.getJurisdictionByPan(pan)
      ]);

      return {
        user,
        bankAccounts,
        jurisdiction
      };
    } catch (error) {
      console.error('Error fetching user data from database:', error);
      throw error;
    }
  }
}

export default new UserDataService();
