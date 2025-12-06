const { chromium } = require('playwright');

/**
 * Debug script to see PrizePicks network calls
 * Run with: node scraper-debug.js
 */

async function debugPrizePicks() {
  console.log('🔍 Starting PrizePicks debug session...');
  
  const browser = await chromium.launch({
    headless: false, // Show browser so you can see what's happening
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  
  // Log all network requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('api') || url.includes('projection') || url.includes('props')) {
      console.log('📤 REQUEST:', request.method(), url);
    }
  });
  
  // Log all network responses
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('api') || url.includes('projection') || url.includes('props')) {
      console.log('📥 RESPONSE:', response.status(), url);
      
      try {
        const contentType = response.headers()['content-type'];
        if (contentType && contentType.includes('json')) {
          const data = await response.json();
          console.log('📊 JSON DATA PREVIEW:', JSON.stringify(data).substring(0, 200) + '...');
        }
      } catch (e) {
        // Not JSON
      }
    }
  });
  
  console.log('\n🌐 Navigating to PrizePicks...\n');
  
  try {
    await page.goto('https://app.prizepicks.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    console.log('\n✅ Page loaded! Waiting for data...\n');
    await page.waitForTimeout(10000);
    
    console.log('\n📸 Taking screenshot...');
    await page.screenshot({ path: 'debug/prizepicks-screenshot.png', fullPage: true });
    
    console.log('\n✅ Debug session complete!');
    console.log('Check the console output above for API endpoints');
    console.log('Screenshot saved to: debug/prizepicks-screenshot.png');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
}

debugPrizePicks().catch(console.error);
