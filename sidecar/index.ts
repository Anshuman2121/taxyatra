import WebSocket, { WebSocketServer } from 'ws';
import puppeteerService from './services/puppeteer.service';
import registrationService from './services/RegistrationService';
import ITRApiService from './services/api/index';
import http from 'http';

// Create HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('TaxYatra Sidecar Active\n');
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server });

let currentCaptchaResolver: ((text: string) => void) | null = null;

wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    ws.on('message', async (message: Buffer | ArrayBuffer | Buffer[]) => {
        try {
            const data = JSON.parse(message.toString());
            const { id, method, params } = data;

            // Helper to send response
            const sendResponse = (result: any, error?: string) => {
                ws.send(JSON.stringify({ id, result, error }));
            };

            // Helper to send progress
            const sendProgress = (status: string) => {
                ws.send(JSON.stringify({ method: 'progress', params: { status } }));
            };

            switch (method) {
                case 'init':
                    registrationService.init(params.userDataPath);
                    await puppeteerService.init(params.userDataPath, sendProgress);
                    sendResponse({ success: true });
                    break;

                case 'registration_check':
                    const regCheck = await registrationService.checkRegistration();
                    sendResponse(regCheck);
                    break;

                case 'registration_submit':
                    const regSubmit = await registrationService.register(params.licenseKey);
                    sendResponse(regSubmit);
                    break;

                case 'registration_revoked':
                    await registrationService.clearRegistration();
                    sendResponse({ success: true });
                    break;

                case 'registration_machine_id':
                    const mId = await registrationService.getMachineId();
                    sendResponse({ machineId: mId });
                    break;

                case 'login':
                    const loginResult = await puppeteerService.login(params.pan, params.password, sendProgress);
                    sendResponse(loginResult);
                    break;

                case 'fetch_profile':
                    const loginRes = await puppeteerService.login(params.pan, params.password, sendProgress);
                    if (!loginRes.success || !loginRes.cookies) {
                        throw new Error(loginRes.message || 'Login failed');
                    }
                    const profileData = await ITRApiService.fetchAllUserData(params.pan, params.password, loginRes.cookies);
                    sendResponse(profileData);
                    break;

                case 'download_26as':
                    const result26as = await puppeteerService.download26AS(
                        params.pan,
                        params.password,
                        params.assessmentYear,
                        params.downloadPath,
                        sendProgress
                    );
                    sendResponse(result26as);
                    break;

                case 'download_ais':
                    const resultAis = await puppeteerService.downloadAIS(
                        params.pan,
                        params.password,
                        params.financialYear,
                        params.downloadPath,
                        async (image: string) => {
                            ws.send(JSON.stringify({ method: 'captcha_required', params: { image } }));
                            return new Promise<string>((resolve) => {
                                currentCaptchaResolver = resolve;
                            });
                        },
                        sendProgress
                    );
                    sendResponse(resultAis);
                    break;

                case 'download_tis':
                    const resultTis = await puppeteerService.downloadTIS(
                        params.pan,
                        params.password,
                        params.financialYear,
                        params.downloadPath,
                        sendProgress
                    );
                    sendResponse(resultTis);
                    break;

                case 'captcha_response':
                    if (currentCaptchaResolver) {
                        currentCaptchaResolver(params.text);
                        currentCaptchaResolver = null;
                    } else {
                        console.warn('Received captcha response but no pending resolver');
                    }
                    break;

                case 'close':
                    await puppeteerService.close();
                    sendResponse({ success: true });
                    process.exit(0);
                    break;

                default:
                    sendResponse(null, 'Unknown method');
            }

        } catch (error: any) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({ error: error.message }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Start server on random port
server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    if (address && typeof address !== 'string') {
        console.log(`PORT: ${address.port}`);
    }
});
