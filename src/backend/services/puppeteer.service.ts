const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

class PuppeteerService {
  async loginWithPuppeteer(pan: string, password: string) {
    console.log('Starting browser...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    try {
      const page = await browser.newPage();
      await page.evaluateOnNewDocument(() => {
        delete navigator.__proto__.webdriver;
      });
      
      console.log('Navigating to login page...');
      await page.goto('https://eportal.incometax.gov.in/iec/foservices/#/login', {
        waitUntil: 'networkidle0',
        timeout: 60000
      });

      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('Entering PAN...');
      await page.waitForSelector('#panAdhaarUserId');
      await page.type('#panAdhaarUserId', pan);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Clicking Continue...');
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const continueBtn = btns.find(b => b.textContent.includes('Continue'));
        if (continueBtn) continueBtn.click();
      });
      
      await new Promise(resolve => setTimeout(resolve, 4000));
      console.log('Checking secure access checkbox...');
      await page.waitForSelector('#passwordCheckBox-input');
      await page.click('#passwordCheckBox-input');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Entering password...');
      await page.waitForSelector('#loginPasswordField');
      await page.type('#loginPasswordField', password);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Clicking Login...');
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const loginBtn = btns.find(b => b.textContent.includes('Continue'));
        if (loginBtn) loginBtn.click();
      });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const pageText = await page.evaluate(() => document.body.innerText);
      if (pageText.includes('Dual Login') || pageText.includes('session') && pageText.includes('active')) {
        console.log('Dual login detected, clicking Login Here...');
        await page.evaluate(() => {
          const allElements = Array.from(document.querySelectorAll('*'));
          const loginHereBtn = allElements.find(el => 
            el.textContent && el.textContent.trim() === 'Login Here' && 
            (el.tagName === 'BUTTON' || el.onclick || el.style.cursor === 'pointer')
          );
          if (loginHereBtn) {
            loginHereBtn.click();
          }
        });
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        await new Promise(resolve => setTimeout(resolve, 7000));
      }
      
      console.log('Capturing cookies...');
      const cookies = await page.cookies();
      const authToken = cookies.find(c => c.name === 'AuthToken');
      
      const finalUrl = page.url();
      console.log('Final URL:', finalUrl);
      
      await browser.close();
      console.log('Browser closed');
      
      if (authToken) {
        console.log('✅ Login successful! AuthToken captured');
        return { success: true, cookies, authToken: authToken.value };
      } else {
        console.log('❌ No AuthToken found');
        throw new Error('Login failed - no AuthToken received');
      }
    } catch (error) {
      await browser.close();
      throw error;
    }
  }
}

export default new PuppeteerService();
