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
    this.axiosInstance.interceptors.request.use(async config => {
      console.log('Request:', config.method?.toUpperCase(), config.url);

      if (config.url) {
        const cookies = await this.cookieJar.getCookieString(config.url);
        console.log('🍪 [API Service] Outgoing Cookies:', cookies);
      }

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
    console.log('🔧 [API Service] Setting', cookies.length, 'cookies with full attributes...');
    console.log('📋 [API Service] Raw cookies received:', JSON.stringify(cookies, null, 2));

    for (const cookie of cookies) {
      try {
        // Construct cookie string with all available attributes
        let cookieString = `${cookie.name}=${cookie.value}`;
        if (cookie.domain) cookieString += `; domain=${cookie.domain}`;
        if (cookie.path) cookieString += `; path=${cookie.path}`;
        if (cookie.secure) cookieString += '; Secure';
        if (cookie.httpOnly) cookieString += '; HttpOnly';
        if (cookie.expires && cookie.expires !== -1) {
          const expiresDate = new Date(cookie.expires * 1000);
          cookieString += `; expires=${expiresDate.toUTCString()}`;
        }
        if (cookie.sameSite) cookieString += `; SameSite=${cookie.sameSite}`;

        const url = `https://${cookie.domain?.startsWith('.') ? 'www' + cookie.domain : cookie.domain}${cookie.path}`;

        console.log(`  → Setting: ${cookie.name}`);
        console.log(`    String: ${cookieString}`);
        console.log(`    URL: ${url}`);

        await this.cookieJar.setCookie(cookieString, url);
        console.log(`    ✅ Set successfully`);

        // Special handling for AuthToken: Force set it for eportal.incometax.gov.in as well
        // This handles cases where tough-cookie domain matching is strict or flaky with leading dots
        if (cookie.name === 'AuthToken' && cookie.domain === '.incometax.gov.in') {
          console.log('    🔄 Duplicating AuthToken for eportal.incometax.gov.in...');
          const eportalCookieString = cookieString.replace('domain=.incometax.gov.in', 'domain=eportal.incometax.gov.in');
          const eportalUrl = 'https://eportal.incometax.gov.in/';
          await this.cookieJar.setCookie(eportalCookieString, eportalUrl);
          console.log(`    ✅ Duplicate set successfully`);
        }
      } catch (error) {
        console.error(`    ❌ Failed to set cookie ${cookie.name}:`, error.message);
      }
    }
    this.sessionInitialized = true;
    console.log('✅ [API Service] All cookies processed');

    // Verify cookies were set
    const setCookies = await this.cookieJar.getCookies('https://eportal.incometax.gov.in');
    console.log('🔍 [API Service] Cookies now in jar:', setCookies.length);
    console.log('📋 [API Service] Cookie names in jar:', setCookies.map(c => c.key).join(', '));
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

  async fetchAllUserData(pan: string, password: string, cookies: any[]): Promise<any> {
    console.log('\n========================================');
    console.log('📊 [API Service] Starting fetchAllUserData');
    console.log('🔑 PAN:', pan);
    console.log('🍪 Cookies received:', cookies.length);
    console.log('========================================\n');

    try {
      await this.initializeSession();
      console.log('✅ [API Service] Session initialized');

      // Set cookies using the proper method that preserves all attributes
      console.log('🍪 [API Service] Setting cookies in cookie jar...');
      await this.setCookies(cookies);
      console.log('✅ [API Service] Cookies set successfully');

      // Fetch prefill data - this contains all the data we need
      console.log('📊 [API Service] Fetching prefill data from income tax portal...');
      const prefillResponse = await this.getPrefillData(pan);
      console.log('✅ [API Service] Prefill data fetched successfully');
      console.log('📋 [API Service] Response structure:', JSON.stringify(Object.keys(prefillResponse), null, 2));

      // Parse the content field if it's a string (the API returns stringified JSON in the content field)
      let prefillData;
      if (prefillResponse.content && typeof prefillResponse.content === 'string') {
        console.log('🔄 [API Service] Parsing stringified content field...');
        try {
          prefillData = JSON.parse(prefillResponse.content);
          console.log('✅ [API Service] Content parsed successfully');
        } catch (parseError) {
          console.error('❌ [API Service] Failed to parse content field:', parseError);
          throw new Error('Failed to parse API response content');
        }
      } else if (prefillResponse.content && typeof prefillResponse.content === 'object') {
        // Content is already an object
        prefillData = prefillResponse.content;
      } else {
        // Fallback: assume the response itself is the data
        prefillData = prefillResponse;
      }

      console.log('📋 [API Service] Prefill data structure:', JSON.stringify(Object.keys(prefillData), null, 2));

      // Extract individual components from the prefill data
      // The data is at the root level of the parsed content
      const personalInfo = prefillData.personalInfo || {};
      const bankAccountDtls = prefillData.bankAccountDtls || [];
      const form26as = prefillData.form26as || {};
      const form24q = prefillData.form24q || {};
      const filingStatus = prefillData.filingStatus || {};
      const insights = prefillData.insights || {};

      console.log('👤 [API Service] Personal info extracted:', personalInfo?.assesseeName?.firstName, personalInfo?.assesseeName?.surNameOrOrgName);
      console.log('🏦 [API Service] Bank accounts extracted:', bankAccountDtls?.length || 0, 'accounts');
      console.log('📄 [API Service] Form 26AS extracted:', form26as ? 'Yes' : 'No');
      console.log('📄 [API Service] Form 24Q extracted:', form24q ? 'Yes' : 'No');
      console.log('📊 [API Service] Filing status extracted:', filingStatus ? 'Yes' : 'No');
      console.log('💡 [API Service] Insights extracted:', insights ? 'Yes' : 'No');

      return {
        personalInfo,
        bankAccountDtls,
        form26as,
        form24q,
        filingStatus,
        insights
      };
    } catch (error) {
      console.error('❌ [API Service] Failed to fetch user data:', error.message);
      console.error('❌ [API Service] Error stack:', error.stack);
      throw new Error(`Failed to fetch user data: ${error.message}`);
    }
  }
}

export default new ITRApiService();
