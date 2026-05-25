import { execFile } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { homedir, platform } from 'node:os'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const profileDir = process.env.EDGEKIT_CHROME_USER_DATA_DIR ?? resolve(homedir(), '.edgekit/chrome-profile')
const cacheDir = process.env.EDGEKIT_CHROME_CACHE_DIR ?? resolve(homedir(), '.edgekit/chrome-cache')
const port = process.env.EDGEKIT_CHROME_DEBUG_PORT ?? '9223'
const url = process.env.EDGEKIT_CHROME_START_URL ?? 'chrome://on-device-internals'

await mkdir(profileDir, { recursive: true })
await mkdir(cacheDir, { recursive: true })

if (platform() !== 'darwin') {
  throw new Error('launch-chrome-profile currently supports macOS. Launch Chrome manually with the printed args.')
}

const args = [
  '-na',
  'Google Chrome',
  '--args',
  `--user-data-dir=${profileDir}`,
  `--disk-cache-dir=${cacheDir}`,
  `--remote-debugging-port=${port}`,
  '--no-first-run',
  '--disable-first-run-ui',
  url,
]

await execFileAsync('open', args)

console.log(JSON.stringify({
  profileDir,
  cacheDir,
  cdpURL: `http://127.0.0.1:${port}`,
  startURL: url,
  next: `EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:${port} EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:env`,
}, null, 2))
