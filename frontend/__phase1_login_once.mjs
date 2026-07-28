import { chromium } from 'playwright'
import fs from 'node:fs'

const outDir = 'C:\\Users\\MYPC~1\\AppData\\Local\\Temp\\claude\\c--Users-MY-PC-Desktop-Apps-ScholarCraft\\18377b55-76d4-48d5-aa0d-2a591c2a0fc9\\scratchpad'

const browser = await chromium.launch({
  executablePath: 'C:\\Users\\MY PC\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe',
})
const context = await browser.newContext({ viewport: { width: 1400, height: 1200 } })
const page = await context.newPage()

await page.goto('http://localhost:3002/sign-in', { waitUntil: 'domcontentloaded' })
await page.fill('input[name="email"], input[type="email"]', 'pw-smoketest@example.com')
await page.fill('input[name="password"], input[type="password"]', 'SmokeTest123!')
await page.click('button[type="submit"]')
await page.waitForURL(/dashboard/i, { timeout: 15000 })

await context.storageState({ path: `${outDir}/storageState.json` })
console.log('SAVED storageState.json')

await browser.close()