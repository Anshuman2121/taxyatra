import { registerAuthHandlers } from './auth.controller';
import { registerUserHandlers } from './user.controller';

export function registerIpcHandlers() {
    registerAuthHandlers();
    registerUserHandlers();
}
