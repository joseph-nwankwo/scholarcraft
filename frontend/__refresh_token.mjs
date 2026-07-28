import fs from 'node:fs'

const outDir = 'C:\\Users\\MYPC~1\\AppData\\Local\\Temp\\claude\\c--Users-MY-PC-Desktop-Apps-ScholarCraft\\18377b55-76d4-48d5-aa0d-2a591c2a0fc9\\scratchpad'
const statePath = `${outDir}/storageState.json`
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'))
const cookieEntry = state.cookies.find((c) => c.name === 'lc_refresh')

const resp = await fetch('http://localhost:4001/api/auth/refresh', {
  method: 'POST',
  headers: { Cookie: `lc_refresh=${cookieEntry.value}` },
})
const data = await resp.json()
if (!data?.tokens?.accessToken) {
  console.error('Refresh failed:', JSON.stringify(data))
  process.exit(1)
}

// Refresh tokens rotate on every use — persist the new one or the next call will fail.
const setCookie = resp.headers.get('set-cookie') ?? ''
const match = setCookie.match(/lc_refresh=([^;]+)/)
if (match) cookieEntry.value = match[1]
fs.writeFileSync(statePath, JSON.stringify(state, null, 2))

// Also update the accessToken stored in localStorage within storageState, so a fresh
// browser context loaded from this file starts already authenticated.
for (const origin of state.origins ?? []) {
  const entry = origin.localStorage?.find((e) => e.name === 'accessToken')
  if (entry) entry.value = data.tokens.accessToken
}
fs.writeFileSync(statePath, JSON.stringify(state, null, 2))

fs.writeFileSync(`${outDir}/token.txt`, data.tokens.accessToken)
console.log('Refreshed, token length:', data.tokens.accessToken.length)