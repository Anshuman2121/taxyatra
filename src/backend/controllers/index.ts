import { registerAuthHandlers } from './auth.controller';
import { registerUserHandlers } from './user.controller';
import { registerRegistrationHandlers } from './registration.controller';

export function registerIpcHandlers() {
    registerAuthHandlers();
    registerUserHandlers();
    registerRegistrationHandlers();
}
