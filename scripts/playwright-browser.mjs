import { chromium } from '@playwright/test'

export function browserEnv() {
  return {
    headless: process.env.EDGEKIT_SUITE_HEADLESS !== '0' &&
      process.env.EDGEKIT_EVAL_HEADLESS !== '0' &&
      process.env.EDGEKIT_RESEARCH_HEADLESS !== '0',
    cdpURL: process.env.EDGEKIT_CHROME_CDP_URL,
    userDataDir: process.env.EDGEKIT_CHROME_USER_DATA_DIR,
    channel: process.env.EDGEKIT_CHROME_CHANNEL ?? 'chrome',
    args: parseArgs(process.env.EDGEKIT_CHROME_ARGS),
  }
}

export async function launchEdgekitBrowser(options = {}) {
  const env = browserEnv()
  const headless = options.headless ?? env.headless
  const launchOptions = {
    channel: env.channel,
    headless,
    args: env.args,
  }

  if (env.cdpURL) {
    return chromium.connectOverCDP(env.cdpURL)
  }

  if (env.userDataDir) {
    try {
      return await chromium.launchPersistentContext(env.userDataDir, {
        ...launchOptions,
        viewport: options.viewport,
      })
    } catch {
      return chromium.launchPersistentContext(env.userDataDir, {
        headless,
        args: env.args,
        viewport: options.viewport,
      })
    }
  }

  try {
    return await chromium.launch(launchOptions)
  } catch {
    return chromium.launch({
      headless,
      args: env.args,
    })
  }
}

export function browserMode(options = {}) {
  const env = browserEnv()
  const headless = options.headless ?? env.headless
  return {
    channel: env.channel,
    headless,
    cdpURL: env.cdpURL ?? '',
    persistentProfile: Boolean(env.userDataDir),
    userDataDir: env.userDataDir ?? '',
    args: env.args,
  }
}

function parseArgs(value) {
  if (!value) return []
  return value
    .split(',')
    .map(arg => arg.trim())
    .filter(Boolean)
}
