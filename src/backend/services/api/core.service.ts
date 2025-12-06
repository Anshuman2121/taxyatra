import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

export class ApiCoreService {
    private static instance: ApiCoreService;
    public axiosInstance: AxiosInstance;
    public cookieJar: CookieJar;
    private sessionInitialized: boolean = false;

    private constructor() {
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

        this.setupInterceptors();
    }

    static getInstance(): ApiCoreService {
        if (!ApiCoreService.instance) {
            ApiCoreService.instance = new ApiCoreService();
        }
        return ApiCoreService.instance;
    }

    private setupInterceptors() {
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

    async initializeSession(): Promise<void> {
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
        } catch (error: any) {
            console.error('Session init failed:', error.message);
            throw new Error('Failed to initialize session');
        }
    }
}
