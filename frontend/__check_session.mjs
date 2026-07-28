import { chromium } from 'playwright'

const outDir = 'C:\\Users\\MYPC~1\\AppData\\Local\\Temp\\claude\\c--Users-MY-PC-Desktop-Apps-ScholarCraft\\18377b55-76d4-48d5-aa0d-2a591c2a0fc9\\scratchpad'

const browser = await chromium.launch({
  executablePath: 'C:\\Users\\MY PC\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe',
})
const context = await browser.newContext({ storageState: `${outDir}/storageState.json`, viewport: { width: 1400, height: 1200 } })
const page = await context.newPage()
await page.goto('http://localhost:3002/thesiscraft', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2000)
console.log('URL:', page.url())
await page.screenshot({ path: `${outDir}/session-check.png` })
await browser.close()