import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { API_BASE_URL } from '../../shared/constants';
import { LoginResponse } from '../../shared/types';

class ITRApiService {
  private axiosInstance: AxiosInstance;
  private cookieJar: CookieJar;
  private sessionInitialized = false;

  constructor() {
    this.cookieJar = new CookieJar();
    this.axiosInstance = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true,
      maxRedirects: 5,
      headers: {
        'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    }));
  }

  private async initializeSession(): Promise<void> {
    if (this.sessionInitialized) return;

    await this.axiosInstance.get(`${API_BASE_URL}/foservices/`, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Connection': 'keep-alive'
      }
    });

    this.axiosInstance.defaults.headers['Content-Type'] = 'application/json';
    this.axiosInstance.defaults.headers['Accept'] = 'application/json, text/plain, */*';
    this.axiosInstance.defaults.headers['Origin'] = 'https://eportal.incometax.gov.in';
    this.axiosInstance.defaults.headers['Referer'] = `${API_BASE_URL}/foservices/`;
    
    this.sessionInitialized = true;
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    await this.initializeSession();

    const firstResponse = await this.axiosInstance.post(`${API_BASE_URL}/loginapi/login`, {
      entity: username,
      serviceName: 'wLoginService'
    }, { headers: { 'sn': 'wLoginService' } });

    const firstData = Array.isArray(firstResponse.data) ? firstResponse.data[0] : firstResponse.data;
    
    if (!firstData?.entity) {
      throw new Error('Invalid response from first login call');
    }
    
    const secondResponse = await this.axiosInstance.post(`${API_BASE_URL}/loginapi/login`, {
      ...firstData,
      pass: Buffer.from(password).toString('base64'),
      serviceName: 'loginService'
    }, { headers: { 'sn': 'loginService' } });

    const loginData = Array.isArray(secondResponse.data) ? secondResponse.data[0] : secondResponse.data;

    if (!loginData?.entity) {
      throw new Error('Login failed: Authentication error');
    }

    if (loginData.messages) {
      const errorMessage = loginData.messages.find(msg => msg.type === 'ERROR');
      if (errorMessage) {
        throw new Error(`Login failed: ${errorMessage.desc}`);
      }
    }

    return loginData;
  }

  async getUserProfile(userId: string): Promise<any> {
    const response = await this.axiosInstance.post(`${API_BASE_URL}/servicesapi/auth/saveEntity`, {
      serviceName: 'userProfileService',
      userId
    }, { headers: { 'sn': 'userProfileService' } });

    return Array.isArray(response.data) ? response.data[0] : response.data;
  }

  async getBankDetails(entityNum: string): Promise<any> {
    const response = await this.axiosInstance.post(`${API_BASE_URL}/servicesapi/auth/getEntity`, {
      entityNum,
      serviceName: 'myBankAccountService',
      header: { formName: 'FO-054-PBACC' }
    }, { headers: { 'sn': 'myBankAccountService' } });

    return Array.isArray(response.data) ? response.data[0] : response.data;
  }

  async getJurisdictionDetails(userId: string): Promise<any> {
    const response = await this.axiosInstance.post(`${API_BASE_URL}/servicesapi/auth/saveEntity`, {
      serviceName: 'jurisdictionDetailsService',
      loggedInUserId: userId
    }, { headers: { 'sn': 'jurisdictionDetailsService' } });

    return Array.isArray(response.data) ? response.data[0] : response.data;
  }

  async fetchAllUserData(username: string, password: string) {
    const loginData = await this.login(username, password);
    
    if (!loginData?.entity) {
      throw new Error('Login failed: No valid entity found');
    }
    
    const [userProfile, bankDetails, jurisdictionDetails] = await Promise.all([
      this.getUserProfile(loginData.entity),
      this.getBankDetails(loginData.entity),
      this.getJurisdictionDetails(loginData.entity)
    ]);

    return { login: loginData, profile: userProfile, bankDetails, jurisdiction: jurisdictionDetails };
  }
}

export default new ITRApiService();
