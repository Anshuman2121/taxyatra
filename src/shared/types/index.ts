export interface User {
  pan: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  mobileNo?: string;
  email?: string;
  addrLine1Txt?: string;
  addrLine2Txt?: string;
  addrLine3Txt?: string;
  addrLine4Txt?: string;
  pinCd?: number;
  stateCd?: string;
  aadhaarNum?: string;
  dateOfBirth?: number;
  dob?: string;
  userGender?: string;
  userType?: string;
  role?: string;
  panStatus?: string;
}

export interface BankAccount {
  id?: number;
  pan: string;
  bankAcctNum: string;
  ifscCd: string;
  bankName: string;
  bankBrnchTxt?: string;
  nameAsPerBank?: string;
  accountType?: string;
  status?: string;
  submitDt?: number;
  validDt?: number;
  refundFlag?: string;
  accountStatus?: string;
}

export interface Jurisdiction {
  pan: string;
  areaCd?: string;
  areaDesc?: string;
  aoType?: string;
  rangeCd?: string;
  aoNo?: string;
  aoPplrName?: string;
  aoEmailId?: string;
  aoBldgId?: string;
  aoBldgDesc?: string;
}

export interface LoginResponse {
  reqId: string;
  entity: string;
  entityType: string;
  role: string;
  userType?: string;
  fullName?: string;
  mobileNo?: string;
  email?: string;
  sessionTime?: string;
  passValdtnFlg?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
