const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function loginWithPuppeteer(pan, password) {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  try {
    const page = await browser.newPage();
    
    await page.evaluateOnNewDocument(() => {
      delete navigator.__proto__.webdriver;
    });
    
    await page.goto('https://eportal.incometax.gov.in/iec/foservices/#/login', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await page.waitForSelector('#panAdhaarUserId');
    await page.type('#panAdhaarUserId', pan);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const continueBtn = btns.find(b => b.textContent.includes('Continue'));
      if (continueBtn) continueBtn.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    await page.waitForSelector('#passwordCheckBox-input');
    await page.click('#passwordCheckBox-input');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await page.waitForSelector('#loginPasswordField');
    await page.type('#loginPasswordField', password);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const loginBtn = btns.find(b => b.textContent.includes('Continue'));
      if (loginBtn) loginBtn.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const cookies = await page.cookies();
    const authToken = cookies.find(c => c.name === 'AuthToken');
    
    await browser.close();
    
    if (authToken) {
      return { success: true, cookies, authToken: authToken.value };
    } else {
      throw new Error('Login failed - no AuthToken received');
    }
    
  } catch (error) {
    await browser.close();
    throw error;
  }
}

module.exports = { loginWithPuppeteer };
