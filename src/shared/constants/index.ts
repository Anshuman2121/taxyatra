export const API_BASE_URL = 'https://eportal.incometax.gov.in/iec';

export const DB_CONFIG = {
  DB_FILE: 'taxyatra.db',
  ENCRYPTED_DB_FILE: 'taxyatra.enc'
};

export const IPC_CHANNELS = {
  CHECK_ACTIVATION: 'check-activation',
  VALIDATE_ACTIVATION: 'validate-activation-code',
  SAVE_PAN_CREDENTIALS: 'save-pan-credentials',
  GET_PAN_CREDENTIALS: 'get-pan-credentials',
  GET_PAN_WITH_PASSWORD: 'get-pan-with-password',
  FETCH_USER_PROFILE: 'fetch-user-profile',
  GET_USER_DATA: 'get-user-data'
} as const;
