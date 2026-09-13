#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = resolve(pluginRoot, '..', '..')
const configured = process.env.LIFE_AGENT_JAVA_COMMAND?.trim()
const sourceLauncher = resolve(repositoryRoot, 'build', 'install', 'life-agent', 'bin', 'life-agent')
const candidates = [
  ...(configured ? [configured] : []),
  sourceLauncher,
  'life-agent',
]

function available(candidate) {
  if (candidate.includes('/') || candidate.includes('\\')) {
    return existsSync(candidate)
  }
  const probe = spawnSync(candidate, ['doctor'], {
    stdio: 'ignore',
    windowsHide: true,
    timeout: 10_000,
  })
  return probe.error === undefined || probe.error.code !== 'ENOENT'
}

const launcher = candidates.find(available)
if (!launcher) {
  console.error('Life Agent plugin requires the Java Life Agent launcher.')
  console.error('Install the life-agent npm package, build the Java distribution, or set LIFE_AGENT_JAVA_COMMAND to its absolute launcher path.')
  process.exitCode = 1
} else {
  const child = spawn(launcher, process.argv.slice(2), {
    cwd: process.cwd(),
    env: { ...process.env, LIFE_AGENT_PLUGIN_ROOT: pluginRoot },
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
  })
  const forward = (signal) => { if (!child.killed) child.kill(signal) }
  process.once('SIGINT', () => forward('SIGINT'))
  process.once('SIGTERM', () => forward('SIGTERM'))
  child.once('error', (error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  child.once('exit', (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0)
  })
}
