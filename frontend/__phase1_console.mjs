import { chromium } from 'playwright'
import fs from 'node:fs'

const outDir = 'C:\\Users\\MYPC~1\\AppData\\Local\\Temp\\claude\\c--Users-MY-PC-Desktop-Apps-ScholarCraft\\18377b55-76d4-48d5-aa0d-2a591c2a0fc9\\scratchpad'

const browser = await chromium.launch({
  executablePath: 'C:\\Users\\MY PC\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe',
})
const context = await browser.newContext({ storageState: `${outDir}/storageState.json`, viewport: { width: 1400, height: 1200 } })
const page = await context.newPage()

const logs = []
const markers = []
page.on('console', (msg) => {
  const text = msg.text()
  if (msg.type() !== 'log') return
  if (text.startsWith('[repaginate]')) logs.push(text)
  if (text.startsWith('[sync-effect]') || text.startsWith('[editor-instance]')) markers.push(text)
})

await page.goto('http://localhost:3002/thesiscraft', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
await page.screenshot({ path: `${outDir}/debug-landing.png` })
console.log('URL:', page.url())
await page.waitForSelector('text=Phase1 Margin Audit', { timeout: 15000 })
await page.click('text=Phase1 Margin Audit')
await page.waitForSelector('text=Thesis Assistant', { timeout: 15000 })
await page.click('button:has-text("Thesis Assistant")')
await page.waitForSelector('.tiptap-doc .ProseMirror', { timeout: 15000 })

await page.click('.tiptap-doc .ProseMirror')
const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
for (let i = 1; i <= 12; i++) {
  await page.keyboard.type(`Paragraph ${i}. ${lorem}`)
  await page.keyboard.press('Enter')
}
await page.waitForTimeout(800)

fs.writeFileSync(`${outDir}/repaginate-console.log`, logs.join('\n'))
console.log('TOTAL_INVOCATIONS_OF_REPAGINATE_LOOP_LINES:', logs.length)
console.log('MARKERS (sync-effect / editor-instance):')
console.log(markers.join('\n'))
console.log('LAST_20_LINES:')
console.log(logs.slice(-20).join('\n'))

await browser.close()