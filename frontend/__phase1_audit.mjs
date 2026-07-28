import { chromium } from 'playwright'

const outDir = 'C:\\Users\\MYPC~1\\AppData\\Local\\Temp\\claude\\c--Users-MY-PC-Desktop-Apps-ScholarCraft\\18377b55-76d4-48d5-aa0d-2a591c2a0fc9\\scratchpad'

const PAGE_MARGIN_PX = 96
const PAGE_GAP_PX = 32
const PAGE_HEIGHTS_PX = { LETTER: 1056, A4: 1123 }

const browser = await chromium.launch({
  executablePath: 'C:\\Users\\MY PC\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe',
})
const context = await browser.newContext({ viewport: { width: 1400, height: 1200 } })
const page = await context.newPage()

const consoleErrors = []
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message))

// Log in fresh, in this same process, so the whole test completes well inside the JWT's lifetime.
await page.goto('http://localhost:3002/sign-in', { waitUntil: 'domcontentloaded' })
await page.fill('input[type="email"]', 'pw-smoketest@example.com')
await page.fill('input[type="password"]', 'SmokeTest123!')
await page.click('button[type="submit"]')
await page.waitForURL(/dashboard/i, { timeout: 15000 })

await page.goto('http://localhost:3002/thesiscraft', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=Phase1 Margin Audit', { timeout: 15000 })
await page.click('text=Phase1 Margin Audit')
await page.waitForSelector('text=Thesis Assistant', { timeout: 15000 })
await page.click('button:has-text("Thesis Assistant")')
await page.waitForSelector('.tiptap-doc .ProseMirror', { timeout: 15000 })

// Seed a long multi-paragraph document via direct typing (goes through the real onUpdate path).
await page.click('.tiptap-doc .ProseMirror')
const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
for (let i = 1; i <= 45; i++) {
  await page.keyboard.type(`Paragraph ${i}. ${lorem}`)
  await page.keyboard.press('Enter')
}
await page.waitForSelector('.tiptap-doc .ProseMirror', { timeout: 15000 })
await page.waitForTimeout(800)

/**
 * Checks the live DOM against the same zone math repaginate() uses: for every declared
 * page boundary, no top-level block's rect should straddle from before zoneEnd to after it.
 */
async function checkMargins(pageSizeKey) {
  return page.evaluate(({ PAGE_MARGIN_PX, PAGE_GAP_PX, pageHeight }) => {
    const container = document.querySelector('.tiptap-doc .ProseMirror')
    const children = Array.from(container.children)
    const stride = pageHeight + PAGE_GAP_PX
    const contentHeight = pageHeight - 2 * PAGE_MARGIN_PX

    const violations = []
    let maxPageIndex = 0
    for (const child of children) {
      const top = child.offsetTop
      const height = child.offsetHeight
      const bottom = top + height
      const pageIndex = Math.floor((top - PAGE_MARGIN_PX) / stride)
      maxPageIndex = Math.max(maxPageIndex, pageIndex)
      const zoneStart = PAGE_MARGIN_PX + pageIndex * stride
      const zoneEnd = zoneStart + contentHeight
      if (top < zoneStart - 1 || bottom > zoneEnd + 1) {
        violations.push({
          text: child.textContent.slice(0, 40),
          top, bottom, zoneStart, zoneEnd, pageIndex,
        })
      }
    }
    return { violations, pageCount: maxPageIndex + 1, containerHeight: container.offsetHeight }
  }, { PAGE_MARGIN_PX, PAGE_GAP_PX, pageHeight: PAGE_HEIGHTS_PX[pageSizeKey] })
}

const results = {}

// 1. Initial (Letter, default font)
results.initial = await checkMargins('LETTER')

// 2. Switch to A4
await page.getByRole('combobox', { name: 'Page Size' }).click()
await page.getByRole('option', { name: 'A4' }).click()
await page.waitForTimeout(400)
results.afterA4 = await checkMargins('A4')

// 3. Change font family + size
await page.getByRole('combobox', { name: 'Font', exact: true }).click()
await page.getByRole('option', { name: 'Arial' }).click()
await page.waitForTimeout(200)
await page.getByRole('combobox', { name: 'Font Size' }).click()
await page.getByRole('option', { name: '16 pt' }).click()
await page.waitForTimeout(400)
results.afterFontChange = await checkMargins('A4')

// 4. Back to Letter for a clean resize test
await page.getByRole('combobox', { name: 'Page Size' }).click()
await page.getByRole('option', { name: 'US Letter' }).click()
await page.waitForTimeout(400)

// 5. Resize window
await page.setViewportSize({ width: 1000, height: 900 })
await page.waitForTimeout(400)
results.afterResize = await checkMargins('LETTER')

await page.setViewportSize({ width: 1400, height: 1200 })
await page.waitForTimeout(400)

// 6. Live typing at the end
await page.click('.tiptap-doc .ProseMirror')
await page.keyboard.press('Control+End')
await page.keyboard.type(' Appended live-typed sentence to confirm repagination keeps up as you type.')
await page.waitForTimeout(400)
results.afterLiveTyping = await checkMargins('LETTER')

await page.screenshot({ path: `${outDir}/phase1-final.png`, fullPage: false })

console.log('RESULTS:', JSON.stringify(results, null, 2))
console.log('CONSOLE_ERRORS:', JSON.stringify(consoleErrors))

const anyViolations = Object.values(results).some((r) => r.violations.length > 0)
console.log(anyViolations ? 'FAIL: margin violations found' : 'PASS: no margin violations at any checkpoint')

await browser.close()