import { AxiosInstance } from 'axios';
import { ApiCoreService } from '../core.service';

export abstract class BaseEndpoint {
    protected core: ApiCoreService;

    constructor() {
        this.core = ApiCoreService.getInstance();
    }

    protected get axios(): AxiosInstance {
        return this.core.axiosInstance;
    }

    protected async ensureSession() {
        await this.core.initializeSession();
    }
}
