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



class ITRApiService {
  private axiosInstance: AxiosInstance;
  private cookieJar: CookieJar;
  private sessionInitialized: boolean = false;

  constructor() {
    this.cookieJar = new CookieJar();
    this.axiosInstance = wrapper(axios.create({
      jar: this.cookieJar,
      withCredentials: true,
      maxRedirects: 5,
      headers: {
        'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
      }
    }));

    // Log all requests and responses
    this.axiosInstance.interceptors.request.use(config => {
      console.log('Request:', config.method?.toUpperCase(), config.url);
      return config;
    });

    this.axiosInstance.interceptors.response.use(response => {
      if (response.headers['set-cookie']) {
        console.log('Set-Cookie headers:', response.headers['set-cookie']);
      }
      return response;
    });
  }

  private async initializeSession(): Promise<void> {
    if (this.sessionInitialized) return;

    try {
      console.log('Initializing session...');
      await this.axiosInstance.get('https://eportal.incometax.gov.in/iec/foservices/', {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Connection': 'keep-alive'
        }
      });

      this.axiosInstance.defaults.headers['Content-Type'] = 'application/json';
      this.axiosInstance.defaults.headers['Accept'] = 'application/json, text/plain, */*';
      this.axiosInstance.defaults.headers['Origin'] = 'https://eportal.incometax.gov.in';
      this.axiosInstance.defaults.headers['Referer'] = 'https://eportal.incometax.gov.in/iec/foservices/';
      this.axiosInstance.defaults.headers['Connection'] = 'keep-alive';
      this.axiosInstance.defaults.headers['Sec-Fetch-Dest'] = 'empty';
      this.axiosInstance.defaults.headers['Sec-Fetch-Mode'] = 'cors';
      this.axiosInstance.defaults.headers['Sec-Fetch-Site'] = 'same-origin';
      this.axiosInstance.defaults.headers['Sec-GPC'] = '1';

      this.sessionInitialized = true;
      console.log('Session initialized');
    } catch (error) {
      console.error('Session init failed:', error.message);
      throw new Error('Failed to initialize session');
    }
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      await this.initializeSession();

      console.log('Cookies before first call:', await this.cookieJar.getCookies('https://eportal.incometax.gov.in'));

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
      console.log('Cookies after first call:', await this.cookieJar.getCookies('https://eportal.incometax.gov.in'));

      const firstData = Array.isArray(firstResponse.data) ? firstResponse.data[0] : firstResponse.data;

      if (!firstData || !firstData.entity) {
        throw new Error('Invalid response from first login call');
      }

      // Second login call with password
      const secondResponse = await this.axiosInstance.post(`${BASE_URL}/loginapi/login`, {
        ...firstData,
        pass: Buffer.from(password).toString('base64'),
        passValdtnFlg: null,
        otpGenerationFlag: null,
        otp: null,
        otpValdtnFlg: null,
        otpSourceFlag: null,
        contactPan: null,
        contactMobile: null,
        contactEmail: null,
        email: null,
        mobileNo: null,
        forgnDirEmailId: null,
        imagePath: null,
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
        const errorMessage = loginData.messages.find((msg: any) => msg.type === 'ERROR');
        if (errorMessage) {
          throw new Error(`Login failed: ${errorMessage.desc}`);
        }
      }

      console.log('Login completed, passValdtnFlg:', loginData.passValdtnFlg);

      return loginData;
    } catch (error) {
      console.error('Login error details:', error);
      throw new Error(`Login failed: ${error.message}`);
    }
  }



  async setCookies(cookies: any[]) {
    for (const cookie of cookies) {
      await this.cookieJar.setCookie(
        `${cookie.name}=${cookie.value}; domain=${cookie.domain}; path=${cookie.path}`,
        `https://${cookie.domain}${cookie.path}`
      );
    }
    this.sessionInitialized = true;
  }

  async getPrefillData(pan: string, assessmentYear: string = '2025'): Promise<any> {
    try {
      const response = await this.axiosInstance.post(
        'https://eportal.incometax.gov.in/iec/itrweb/auth/v0.1/returns/getPrefillCurrentYr',
        { pan, assessmentYear },
        {
          headers: {
            'sn': 'NA',
            'sec-ch-ua': '"Brave";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Prefill API Error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch prefill data: ${error.message}`);
    }
  }

  async fetchAllUserData(username: string, password: string, cookies?: any[]) {
    try {
      let loginData: LoginResponse;

      if (cookies && cookies.length > 0) {
        console.log('Using provided cookies for session...');
        await this.setCookies(cookies);
        loginData = {
          reqId: '',
          entity: username,
          entityType: 'PAN',
          role: '',
          userType: '',
          fullName: '',
        };
      } else {
        loginData = await this.login(username, password);
      }

      if (!loginData || !loginData.entity) {
        throw new Error('Login failed: No valid entity found');
      }

      console.log('Fetching prefill data for PAN:', loginData.entity);
      const prefillData = await this.getPrefillData(loginData.entity);
      
      return prefillData;
    } catch (error) {
      throw new Error(`Failed to fetch user data: ${error.message}`);
    }
  }
}

export default new ITRApiService();
