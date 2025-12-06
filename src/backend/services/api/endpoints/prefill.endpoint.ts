import { BaseEndpoint } from './base.endpoint';

export class PrefillEndpoint extends BaseEndpoint {

    async getPrefillData(pan: string, assessmentYear: string = '2025'): Promise<any> {
        try {
            const response = await this.axios.post(
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
        } catch (error: any) {
            console.error('Prefill API Error:', error.response?.data || error.message);
            throw new Error(`Failed to fetch prefill data: ${error.message}`);
        }
    }
}
