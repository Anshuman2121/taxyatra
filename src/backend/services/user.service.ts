import { UserRepository } from '../database/repositories/user.repository';
import { getDatabase } from '../database/connection';
import itrApiService from './itr-api.service';
import { User, BankAccount, Jurisdiction } from '../../shared/types';

class UserService {
  private userRepository: UserRepository | null = null;

  async initialize(): Promise<void> {
    this.userRepository = new UserRepository(getDatabase());
    await this.userRepository.createTables();
  }

  private ensureRepository(): UserRepository {
    if (!this.userRepository) {
      throw new Error('UserService not initialized');
    }
    return this.userRepository;
  }

  async fetchAndSaveUserProfile(username: string, password: string): Promise<void> {
    const userData = await itrApiService.fetchAllUserData(username, password);
    const pan = userData.login.entity;

    const userRecord: User = {
      pan,
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
      panStatus: 'A'
    };

    await this.ensureRepository().saveUser(userRecord);

    const allBankAccounts = [
      ...userData.bankDetails.activeBank,
      ...userData.bankDetails.inActiveBank,
      ...userData.bankDetails.failedBank
    ];

    const bankAccountRecords: BankAccount[] = allBankAccounts.map(account => ({
      pan,
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

    await this.ensureRepository().saveBankAccounts(pan, bankAccountRecords);

    const jurisdictionRecord: Jurisdiction = {
      pan,
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

    await this.ensureRepository().saveJurisdiction(jurisdictionRecord);
  }

  async getUserData(pan: string) {
    const repo = this.ensureRepository();
    const [user, bankAccounts, jurisdiction] = await Promise.all([
      repo.getUserByPan(pan),
      repo.getBankAccountsByPan(pan),
      repo.getJurisdictionByPan(pan)
    ]);

    return { user, bankAccounts, jurisdiction };
  }
}

export default new UserService();
