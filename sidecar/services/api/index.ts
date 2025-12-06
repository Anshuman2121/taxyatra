import { AuthEndpoint, LoginResponse } from './endpoints/auth.endpoint';
import { PrefillEndpoint } from './endpoints/prefill.endpoint';

class ITRApiService {
    private auth: AuthEndpoint;
    private prefill: PrefillEndpoint;

    constructor() {
        this.auth = new AuthEndpoint();
        this.prefill = new PrefillEndpoint();
    }

    // Facade Methods mirroring original API

    async login(username: string, password: string): Promise<LoginResponse> {
        return this.auth.login(username, password);
    }

    async setCookies(cookies: any[]) {
        return this.auth.setCookies(cookies);
    }

    async getPrefillData(pan: string, assessmentYear: string = '2025'): Promise<any> {
        return this.prefill.getPrefillData(pan, assessmentYear);
    }

    async fetchAllUserData(pan: string, password: string, cookies: any[]): Promise<any> {
        console.log('\n========================================');
        console.log('📊 [API Service] Starting fetchAllUserData');
        console.log('🔑 PAN:', pan);
        console.log('🍪 Cookies received:', cookies.length);
        console.log('========================================\n');

        try {
            await this.auth.setCookies(cookies);

            // Fetch prefill data
            console.log('📊 [API Service] Fetching prefill data from income tax portal...');
            const prefillResponse = await this.prefill.getPrefillData(pan);
            console.log('✅ [API Service] Prefill data fetched successfully');

            // Parse logic from original service
            let prefillData;
            if (prefillResponse.content && typeof prefillResponse.content === 'string') {
                console.log('🔄 [API Service] Parsing stringified content field...');
                try {
                    prefillData = JSON.parse(prefillResponse.content);
                } catch (parseError) {
                    console.error('❌ [API Service] Failed to parse content field:', parseError);
                    throw new Error('Failed to parse API response content');
                }
            } else if (prefillResponse.content && typeof prefillResponse.content === 'object') {
                prefillData = prefillResponse.content;
            } else {
                prefillData = prefillResponse;
            }

            const personalInfo = prefillData.personalInfo || {};
            const bankAccountDtls = prefillData.bankAccountDtls || [];
            const form26as = prefillData.form26as || {};
            const form24q = prefillData.form24q || {};
            const filingStatus = prefillData.filingStatus || {};
            const insights = prefillData.insights || {};

            console.log('👤 [API Service] Personal info extracted:', personalInfo?.assesseeName?.firstName, personalInfo?.assesseeName?.surNameOrOrgName);

            return {
                personalInfo,
                bankAccountDtls,
                form26as,
                form24q,
                filingStatus,
                insights
            };
        } catch (error: any) {
            console.error('❌ [API Service] Failed to fetch user data:', error.message);
            throw new Error(`Failed to fetch user data: ${error.message}`);
        }
    }
}

export default new ITRApiService();
