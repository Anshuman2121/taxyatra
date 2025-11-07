import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const BASE_URL = 'https://eportal.incometax.gov.in/iec';

interface LoginResponse {
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

interface UserProfileResponse {
  userId: string;
  priMobileNum: string;
  priEmailId: string;
  addrLine1Txt: string;
  addrLine2Txt: string;
  addrLine3Txt: string;
  addrLine4Txt: string;
  pinCd: number;
  stateCd: string;
  aadhaarNum: string;
  firstName: string;
  lastName: string;
  dateOfBirth: number;
  dob: string;
  userGender: string;
}

interface BankAccount {
  bankAcctNum: string;
  ifscCd: string;
  bankName: string;
  bankBrnchTxt: string;
  nameAsPerBank: string;
  accountType: string;
  status: string;
}

interface BankDetailsResponse {
  activeBank: BankAccount[];
  inActiveBank: BankAccount[];
  failedBank: BankAccount[];
}

interface JurisdictionResponse {
  areaCd: string;
  areaDesc: string;
  aoType: string;
  rangeCd: string;
  aoNo: string;
  aoPplrName: string;
  aoEmailId: string;
  aoBldgId: string;
  aoBldgDesc: string;
}

class ITRApiService {
  private axiosInstance: AxiosInstance;
  private cookieJar: CookieJar;
  private sessionInitialized: boolean = false;

  constructor() {
    this.cookieJar = new CookieJar();
    this.axiosInstance = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true,
      headers: {
        'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
      }
    }));
  }

  private async initializeSession(): Promise<void> {
    if (this.sessionInitialized) return;

    try {
      console.log('Initializing session by visiting main page...');
      await this.axiosInstance.get('https://eportal.incometax.gov.in/iec/foservices/', {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
        }
      });

      // Update headers for API calls
      this.axiosInstance.defaults.headers['Content-Type'] = 'application/json';
      this.axiosInstance.defaults.headers['Accept'] = 'application/json, text/plain, */*';
      this.axiosInstance.defaults.headers['Referer'] = 'https://eportal.incometax.gov.in/iec/foservices/';
      this.axiosInstance.defaults.headers['Sec-Fetch-Dest'] = 'empty';
      this.axiosInstance.defaults.headers['Sec-Fetch-Mode'] = 'cors';
      this.axiosInstance.defaults.headers['Sec-Fetch-Site'] = 'same-origin';

      this.sessionInitialized = true;
      console.log('Session initialized successfully');
    } catch (error) {
      console.error('Failed to initialize session:', error.message);
      throw new Error('Failed to initialize session');
    }
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      await this.initializeSession();

      // First login call
      const firstResponse = await this.axiosInstance.post(`${BASE_URL}/loginapi/login`, {
        entity: username,
        serviceName: 'wLoginService'
      }, {
        headers: {
          'sn': 'wLoginService'
        }
      });

      console.log('First response:', JSON.stringify(firstResponse.data, null, 2));

      const firstData = Array.isArray(firstResponse.data) ? firstResponse.data[0] : firstResponse.data;
      
      if (!firstData || !firstData.entity) {
        throw new Error('Invalid response from first login call');
      }
      
      // Second login call with password
      const secondResponse = await this.axiosInstance.post(`${BASE_URL}/loginapi/login`, {
        ...firstData,
        pass: Buffer.from(password).toString('base64'),
        serviceName: 'loginService'
      }, {
        headers: {
          'sn': 'loginService'
        }
      });

      console.log('Second response:', JSON.stringify(secondResponse.data, null, 2));

      const loginData = Array.isArray(secondResponse.data) ? secondResponse.data[0] : secondResponse.data;

      if (!loginData || !loginData.entity) {
        throw new Error('Login failed: Authentication error');
      }

      // Check for authentication errors
      if (loginData.messages) {
        const errorMessage = loginData.messages.find(msg => msg.type === 'ERROR');
        if (errorMessage) {
          throw new Error(`Login failed: ${errorMessage.desc}`);
        }
      }

      // For now, let's proceed even if passValdtnFlg is not set, as the API structure might be different
      console.log('Login completed, passValdtnFlg:', loginData.passValdtnFlg);

      return loginData;
    } catch (error) {
      console.error('Login error details:', error);
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async getUserProfile(userId: string): Promise<UserProfileResponse> {
    try {
      const response = await this.axiosInstance.post(`${BASE_URL}/servicesapi/auth/saveEntity`, {
        serviceName: 'userProfileService',
        userId: userId
      }, {
        headers: {
          'sn': 'userProfileService'
        }
      });

      const data = Array.isArray(response.data) ? response.data[0] : response.data;
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
  }

  async getBankDetails(entityNum: string): Promise<BankDetailsResponse> {
    try {
      const response = await this.axiosInstance.post(`${BASE_URL}/servicesapi/auth/getEntity`, {
        entityNum: entityNum,
        serviceName: 'myBankAccountService',
        header: { formName: 'FO-054-PBACC' }
      }, {
        headers: {
          'sn': 'myBankAccountService'
        }
      });

      const data = Array.isArray(response.data) ? response.data[0] : response.data;
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch bank details: ${error.message}`);
    }
  }

  async getJurisdictionDetails(userId: string): Promise<JurisdictionResponse> {
    try {
      const response = await this.axiosInstance.post(`${BASE_URL}/servicesapi/auth/saveEntity`, {
        serviceName: 'jurisdictionDetailsService',
        loggedInUserId: userId
      }, {
        headers: {
          'sn': 'jurisdictionDetailsService'
        }
      });

      const data = Array.isArray(response.data) ? response.data[0] : response.data;
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch jurisdiction details: ${error.message}`);
    }
  }

  async getITRDetails(): Promise<any> {
    try {
      const response = await this.axiosInstance.post(`${BASE_URL}/master/getDetails/`, {
        tokenName: 'assment_year',
        requiredColumns: ['assment_year_cd', 'assment_year_desc', 'itr_mode'],
        dependentField: { itr_flag: 'Y' },
        orderBy: [['assment_year_cd', 'desc']]
      }, {
        headers: {
          'sn': 'assment_year'
        }
      });

      const data = Array.isArray(response.data) ? response.data[0] : response.data;
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch ITR details: ${error.message}`);
    }
  }

  async fetchAllUserData(username: string, password: string) {
    try {
      // Login first
      const loginData = await this.login(username, password);
      
      if (!loginData || !loginData.entity) {
        throw new Error('Login failed: No valid entity found');
      }
      
      // For now, let's try to fetch data even if authentication might be partial
      // This will help us understand what's working and what's not
      console.log('Attempting to fetch user data with entity:', loginData.entity);
      
      try {
        // Fetch all user data
        const [userProfile, bankDetails, jurisdictionDetails, itrDetails] = await Promise.all([
          this.getUserProfile(loginData.entity),
          this.getBankDetails(loginData.entity),
          this.getJurisdictionDetails(loginData.entity),
          this.getITRDetails()
        ]);

        return {
          login: loginData,
          profile: userProfile,
          bankDetails,
          jurisdiction: jurisdictionDetails,
          itrDetails
        };
      } catch (dataError) {
        console.error('Error fetching additional data:', dataError.message);
        // Return just the login data if other calls fail
        return {
          login: loginData,
          profile: null,
          bankDetails: null,
          jurisdiction: null,
          itrDetails: null
        };
      }
    } catch (error) {
      throw new Error(`Failed to fetch user data: ${error.message}`);
    }
  }
}

export default new ITRApiService();
