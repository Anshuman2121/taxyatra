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
      // Fetch all user data from API
      const userData = await ITRApiService.fetchAllUserData(username, password, cookies);

      const pan = userData.login.entity;

      // Prepare user data for database
      const userRecord = {
        pan: pan,
        firstName: userData.profile.firstName,
        lastName: userData.profile.lastName,
        fullName: userData.login.fullName,
        mobileNo: userData.profile.priMobileNum,
        email: userData.profile.priEmailId,
        addrLine1Txt: userData.profile.addrLine1Txt,
        addrLine2Txt: userData.profile.addrLine2Txt,
        addrLine3Txt: userData.profile.addrLine3Txt,
        addrLine4Txt: userData.profile.addrLine4Txt,
        pinCd: userData.profile.pinCd,
        stateCd: userData.profile.stateCd,
        aadhaarNum: userData.profile.aadhaarNum,
        dateOfBirth: userData.profile.dateOfBirth,
        dob: userData.profile.dob,
        userGender: userData.profile.userGender,
        userType: userData.login.userType,
        role: userData.login.role,
        panStatus: 'A' // Assuming active
      };

      // Save user data
      await this.ensureUserModel().saveUser(userRecord);

      // Prepare and save bank accounts
      const allBankAccounts = [
        ...userData.bankDetails.activeBank,
        ...userData.bankDetails.inActiveBank,
        ...userData.bankDetails.failedBank
      ];

      const bankAccountRecords = allBankAccounts.map(account => ({
        pan: pan,
        bankAcctNum: account.bankAcctNum,
        ifscCd: account.ifscCd,
        bankName: account.bankName,
        bankBrnchTxt: account.bankBrnchTxt,
        nameAsPerBank: account.nameAsPerBank,
        accountType: account.accountType,
        status: account.status,
        submitDt: account.submitDt,
        validDt: account.validDt,
        refundFlag: account.refundFlag,
        accountStatus: account.accountStatus
      }));

      await this.ensureUserModel().saveBankAccounts(pan, bankAccountRecords);

      // Prepare and save jurisdiction data
      const jurisdictionRecord = {
        pan: pan,
        areaCd: userData.jurisdiction.areaCd,
        areaDesc: userData.jurisdiction.areaDesc,
        aoType: userData.jurisdiction.aoType,
        rangeCd: userData.jurisdiction.rangeCd,
        aoNo: userData.jurisdiction.aoNo,
        aoPplrName: userData.jurisdiction.aoPplrName,
        aoEmailId: userData.jurisdiction.aoEmailId,
        aoBldgId: userData.jurisdiction.aoBldgId,
        aoBldgDesc: userData.jurisdiction.aoBldgDesc
      };

      await this.ensureUserModel().saveJurisdiction(jurisdictionRecord);

      console.log('User profile data saved successfully');
    } catch (error) {
      console.error('Error fetching and saving user profile:', error);
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
