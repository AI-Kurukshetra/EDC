import fs from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

import { buildVoiceoverText, demoConfig } from './demo-video-config.mjs'

const outputDir = demoConfig.outputDir
const scriptPath = path.join(outputDir, 'demo-voiceover-us.txt')
const aiffPath = path.join(outputDir, 'demo-voiceover-us.aiff')
const m4aPath = path.join(outputDir, 'demo-voiceover-us.m4a')

await fs.mkdir(outputDir, { recursive: true })
await fs.writeFile(scriptPath, `${buildVoiceoverText()}\n`, 'utf8')

const sayResult = spawnSync(
  'say',
  ['-v', demoConfig.voice, '-r', String(demoConfig.speakingRate), '-o', aiffPath, '-f', scriptPath],
  { stdio: 'inherit' },
)

if (sayResult.status !== 0) {
  throw new Error(`say exited with status ${sayResult.status ?? 'unknown'}`)
}

const afconvertResult = spawnSync(
  'afconvert',
  ['-f', 'm4af', '-d', 'aac', aiffPath, '-o', m4aPath],
  { stdio: 'inherit' },
)

if (afconvertResult.status !== 0) {
  throw new Error(`afconvert exited with status ${afconvertResult.status ?? 'unknown'}`)
}

console.log(JSON.stringify({ scriptPath, aiffPath, m4aPath }, null, 2))
