import { chromium } from 'playwright'
import fs from 'node:fs'

const token = fs.readFileSync('C:\\Users\\MYPC~1\\AppData\\Local\\Temp\\claude\\c--Users-MY-PC-Desktop-Apps-ScholarCraft\\18377b55-76d4-48d5-aa0d-2a591c2a0fc9\\scratchpad\\token.txt', 'utf8').trim()

const browser = await chromium.launch({
  executablePath: 'C:\\Users\\MY PC\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe',
})
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } })
await page.addInitScript((tok) => { window.localStorage.setItem('accessToken', tok) }, token)

await page.goto('http://localhost:3002/thesiscraft', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=Phase1 Margin Audit', { timeout: 15000 })
await page.click('text=Phase1 Margin Audit')
await page.waitForSelector('text=Thesis Assistant', { timeout: 15000 })
await page.click('button:has-text("Thesis Assistant")')
await page.waitForSelector('.tiptap-doc .ProseMirror', { timeout: 15000 })

await page.click('.tiptap-doc .ProseMirror')
const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
for (let i = 1; i <= 15; i++) {
  await page.keyboard.type(`Paragraph ${i}. ${lorem}`)
  await page.keyboard.press('Enter')
}
await page.waitForTimeout(600)

const trace = await page.evaluate(() => {
  const PAGE_MARGIN_PX = 96
  const PAGE_GAP_PX = 32
  const pageHeight = 1056
  const contentHeight = pageHeight - 2 * PAGE_MARGIN_PX
  const stride = pageHeight + PAGE_GAP_PX

  const container = document.querySelector('.tiptap-doc .ProseMirror')
  const children = Array.from(container.children)
  children.forEach((child) => { child.style.marginTop = '' })

  const log = []
  let pageIndex = 0
  for (const child of children) {
    const zoneStart = PAGE_MARGIN_PX + pageIndex * stride
    const zoneEnd = zoneStart + contentHeight
    const top = child.offsetTop
    const height = child.offsetHeight
    const willPush = top > zoneStart && top + height > zoneEnd
    log.push({
      text: child.textContent.slice(0, 20),
      pageIndexAtCheck: pageIndex, zoneStart, zoneEnd, top, height, bottom: top + height, willPush,
    })
    if (willPush) {
      const currentMargin = parseFloat(getComputedStyle(child).marginTop) || 0
      const naturalTopWithoutMargin = top - currentMargin
      child.style.marginTop = `${zoneStart + stride - naturalTopWithoutMargin}px`
      pageIndex += 1
    }
  }
  return log
})

console.log(JSON.stringify(trace, null, 2))
await browser.close()