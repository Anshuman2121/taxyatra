import { BaseEndpoint } from './base.endpoint';

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

const BASE_URL = 'https://eportal.incometax.gov.in/iec';

export class AuthEndpoint extends BaseEndpoint {

    async login(username: string, password: string): Promise<LoginResponse> {
        try {
            await this.ensureSession();

            console.log('Cookies before first call:', await this.core.cookieJar.getCookies('https://eportal.incometax.gov.in'));

            // First login call
            const firstResponse = await this.axios.post(`${BASE_URL}/loginapi/login`, {
                entity: username,
                serviceName: 'wLoginService'
            }, {
                headers: { 'sn': 'wLoginService' }
            });

            console.log('First response:', JSON.stringify(firstResponse.data, null, 2));
            const firstData = Array.isArray(firstResponse.data) ? firstResponse.data[0] : firstResponse.data;

            if (!firstData || !firstData.entity) {
                throw new Error('Invalid response from first login call');
            }

            // Second login call with password
            const secondResponse = await this.axios.post(`${BASE_URL}/loginapi/login`, {
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
                headers: { 'sn': 'loginService' }
            });

            console.log('Second response:', JSON.stringify(secondResponse.data, null, 2));

            const loginData = Array.isArray(secondResponse.data) ? secondResponse.data[0] : secondResponse.data;

            if (!loginData || !loginData.entity) {
                throw new Error('Login failed: Authentication error');
            }

            if (loginData.messages) {
                const errorMessage = loginData.messages.find((msg: any) => msg.type === 'ERROR');
                if (errorMessage) {
                    throw new Error(`Login failed: ${errorMessage.desc}`);
                }
            }

            console.log('Login completed, passValdtnFlg:', loginData.passValdtnFlg);
            return loginData;
        } catch (error: any) {
            console.error('Login error details:', error);
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    async setCookies(cookies: any[]) {
        console.log('🔧 [API Service] Setting', cookies.length, 'cookies with full attributes...');

        for (const cookie of cookies) {
            try {
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

                await this.core.cookieJar.setCookie(cookieString, url);

                if (cookie.name === 'AuthToken' && cookie.domain === '.incometax.gov.in') {
                    const eportalCookieString = cookieString.replace('domain=.incometax.gov.in', 'domain=eportal.incometax.gov.in');
                    const eportalUrl = 'https://eportal.incometax.gov.in/';
                    await this.core.cookieJar.setCookie(eportalCookieString, eportalUrl);
                }
            } catch (error: any) {
                console.error(`    ❌ Failed to set cookie ${cookie.name}:`, error.message);
            }
        }

        // Manually force session init flag since we have cookies
        // Accessing private field via 'any' cast or we should expose a setter in Core
        (this.core as any).sessionInitialized = true;
        console.log('✅ [API Service] All cookies processed');
    }
}
