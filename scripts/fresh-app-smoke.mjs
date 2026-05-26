import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(repoRoot, 'research-results/package-smoke')
const packsDir = resolve(outDir, 'packs')
const appDir = resolve(tmpdir(), `edgekit-fresh-app-${Date.now()}`)
const fixtureDir = resolve(repoRoot, 'tests/fixtures/fresh-app')

await rm(outDir, { recursive: true, force: true })
await mkdir(packsDir, { recursive: true })

await run('pnpm', ['--dir', 'packages/core', 'pack', '--pack-destination', packsDir], repoRoot)
await run('pnpm', ['--dir', 'packages/ui', 'pack', '--pack-destination', packsDir], repoRoot)
await run('pnpm', ['--dir', 'packages/react', 'pack', '--pack-destination', packsDir], repoRoot)
await run('pnpm', ['--dir', 'packages/cli', 'pack', '--pack-destination', packsDir], repoRoot)

await cp(fixtureDir, appDir, { recursive: true })

const manifestPath = resolve(appDir, 'package.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
manifest.dependencies['@kevinmarmstrong/edgekit'] = `file:${resolve(packsDir, 'kevinmarmstrong-edgekit-0.1.0.tgz')}`
manifest.dependencies['@kevinmarmstrong/edgekit-ui'] = `file:${resolve(packsDir, 'kevinmarmstrong-edgekit-ui-0.1.0.tgz')}`
manifest.dependencies['@kevinmarmstrong/edgekit-react'] = `file:${resolve(packsDir, 'kevinmarmstrong-edgekit-react-0.1.0.tgz')}`
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

await run('npm', ['install'], appDir)
await run('npm', ['run', 'typecheck'], appDir)
await run('npm', ['run', 'build'], appDir)

console.log(`Fresh app package smoke passed: ${appDir}`)

function run(command, args, cwd) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', env: process.env })
    child.on('error', rejectRun)
    child.on('exit', code => {
      if (code === 0) resolveRun()
      else rejectRun(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`))
    })
  })
}
