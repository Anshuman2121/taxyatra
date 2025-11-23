import ITRApiService from './api';
import { UserModel } from '../database/repositories/user.repository';
import { getDatabase } from '../database/connection';

class UserDataService {
  private userModel: UserModel | null = null;

  constructor() {
    // Don't initialize here as DB might not be ready
  }

  private ensureUserModel(): UserModel {
    if (!this.userModel) {
      const db = getDatabase();
      if (!db) {
        throw new Error('Database not initialized. Cannot create UserModel.');
      }
      this.userModel = new UserModel(db);
    }
    return this.userModel;
  }

  async fetchAndSaveUserProfile(username: string, password: string, cookies?: any[]): Promise<void> {
    try {
      const prefillData = await ITRApiService.fetchAllUserData(username, password, cookies);
      console.log('Prefill data fetched successfully');

      const userModel = this.ensureUserModel();

      // 1. Save User Details
      if (prefillData.personalInfo) {
        const pi = prefillData.personalInfo;
        const address = pi.address || {};

        await userModel.saveUser({
          pan: username,
          firstName: pi.assesseeName?.firstName || '',
          lastName: pi.assesseeName?.surNameOrOrgName || '',
          fullName: `${pi.assesseeName?.firstName || ''} ${pi.assesseeName?.middleName || ''} ${pi.assesseeName?.surNameOrOrgName || ''}`.replace(/\s+/g, ' ').trim(),
          mobileNo: address.mobileNo || '',
          email: address.emailAddress || '',
          addrLine1Txt: address.addrLine1Txt || '',
          addrLine2Txt: address.addrLine2Txt || '',
          addrLine3Txt: address.addrLine3Txt || '',
          addrLine4Txt: address.addrLine4Txt || '',
          pinCd: address.pinCd ? parseInt(address.pinCd) : 0,
          stateCd: address.stateCd || '',
          aadhaarNum: pi.aadhaarCardNo || '',
          dateOfBirth: pi.dob ? new Date(pi.dob).getTime() : 0,
          dob: pi.dob || '',
          userGender: pi.gender || '',
          userType: pi.status || '',
          role: 'USER',
          panStatus: pi.panStatus || 'Active'
        });
        console.log('✅ User details saved to database');
      }

      // 2. Save Bank Accounts
      if (prefillData.bankAccountDtls && Array.isArray(prefillData.bankAccountDtls)) {
        const bankAccounts = prefillData.bankAccountDtls.map((acc: any) => ({
          pan: username,
          bankAcctNum: acc.bankAcctNum || '',
          ifscCd: acc.ifscCd || '',
          bankName: acc.bankName || '',
          bankBrnchTxt: acc.bankBrnchTxt || '',
          nameAsPerBank: acc.nameAsPerBank || '',
          accountType: acc.accountType || '',
          status: acc.status || '',
          submitDt: acc.submitDt ? new Date(acc.submitDt).getTime() : 0,
          validDt: acc.validDt ? new Date(acc.validDt).getTime() : 0,
          refundFlag: acc.refundFlag || 'N',
          accountStatus: acc.accountStatus || ''
        }));

        await userModel.saveBankAccounts(username, bankAccounts);
        console.log(`✅ ${bankAccounts.length} bank accounts saved to database`);
      }

      // 3. Save Jurisdiction
      // Note: Prefill data might not have jurisdiction directly, usually it's a separate call or part of profile
      // For now we'll skip if not present or implement a separate fetch if needed later

    } catch (error) {
      console.error('Error fetching/saving user profile:', error);
      throw error;
    }
  }

  async getAllUsers() {
    try {
      const userModel = this.ensureUserModel();
      // We need to add getAllUsers to UserModel first, but for now let's use a raw query if needed
      // or assume we'll add it to the repository.
      // Let's check if we can add it to the repository first.
      // Since I can't see the repository file right now, I'll assume I need to add it there too.
      // But wait, I can access the db directly via userModel.db if public, or I should add a method to UserModel.
      // Let's assume I'll add getAllUsers to UserModel in the next step.
      return await userModel.getAllUsers();
    } catch (error) {
      console.error('Error fetching all users:', error);
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

  async deleteUser(pan: string): Promise<void> {
    try {
      const userModel = this.ensureUserModel();
      await userModel.deleteUser(pan);
      console.log(`✅ User ${pan} deleted successfully`);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

export default new UserDataService();
