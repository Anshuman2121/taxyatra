import { registerAuthHandlers } from './auth.controller';
import { registerUserHandlers } from './user.controller';
import { registerRegistrationHandlers } from './registration.controller';

export function registerIpcHandlers() {
    try {
        console.log('🔌 [Controllers] Registering IPC handlers...');
        registerAuthHandlers();
        console.log('✅ [Controllers] Auth handlers registered');
        registerUserHandlers();
        console.log('✅ [Controllers] User handlers registered');
        registerRegistrationHandlers();
        console.log('✅ [Controllers] Registration handlers registered');
    } catch (error) {
        console.error('❌ [Controllers] Failed to register IPC handlers:', error);
        throw error;
    }
}
