import fs from 'node:fs/promises'
import path from 'node:path'

import { chromium } from '@playwright/test'

import {
  buildVoiceoverText,
  demoConfig,
  demoSegments,
  estimateSegmentDurationMs,
  resolveSegmentPath,
} from './demo-video-config.mjs'

async function ensureOutputDir() {
  await fs.mkdir(demoConfig.outputDir, { recursive: true })
}

async function waitForAnyText(page, candidates) {
  for (const text of candidates) {
    try {
      await page.getByText(text, { exact: false }).first().waitFor({ timeout: 8_000 })
      return
    } catch {}
  }
}

async function waitForPageSettled(page, candidates) {
  await page.waitForLoadState('domcontentloaded')
  try {
    await page.waitForLoadState('networkidle', { timeout: 6_000 })
  } catch {}

  if (candidates.length > 0) {
    await waitForAnyText(page, candidates)
  }
}

async function runMotion(page, motion, totalDurationMs) {
  const settledPause = 1_400
  const scrollPause = 1_200
  const remaining = Math.max(totalDurationMs - settledPause - scrollPause * 2, 2_000)

  await page.waitForTimeout(settledPause)

  if (motion.down > 0) {
    await page.mouse.wheel(0, motion.down)
    await page.waitForTimeout(scrollPause)
  }

  if (motion.up > 0) {
    await page.mouse.wheel(0, -motion.up)
    await page.waitForTimeout(scrollPause)
  }

  await page.waitForTimeout(remaining)
}

async function login(page) {
  await page.goto(`${demoConfig.baseUrl}/login`, { waitUntil: 'domcontentloaded' })
  await waitForPageSettled(page, ['Sign in to Clinical Data Hub', 'Secure access'])

  await page.getByLabel('Email').fill(demoConfig.email)
  await page.getByLabel('Password').fill(demoConfig.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => url.pathname !== '/login', { timeout: 15_000 })
  await waitForPageSettled(page, ['Clinical Data Hub', 'Clinical Operations'])
}

async function writeManifest(videoPath) {
  const manifestPath = path.join(demoConfig.outputDir, 'demo-video-manifest.json')
  const manifest = {
    createdAt: new Date().toISOString(),
    baseUrl: demoConfig.baseUrl,
    studyId: demoConfig.studyId,
    email: demoConfig.email,
    videoPath,
    voiceoverTextPath: path.join(demoConfig.outputDir, 'demo-voiceover-us.txt'),
    voiceoverAudioPath: path.join(demoConfig.outputDir, 'demo-voiceover-us.m4a'),
    segments: demoSegments.map((segment) => ({
      id: segment.id,
      path: resolveSegmentPath(segment),
      durationMs: estimateSegmentDurationMs(segment.narration),
    })),
  }

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

async function recordDemo() {
  await ensureOutputDir()
  await fs.writeFile(
    path.join(demoConfig.outputDir, 'demo-voiceover-us.txt'),
    `${buildVoiceoverText()}\n`,
    'utf8',
  )

  const browser = await chromium.launch({
    headless: true,
  })

  const context = await browser.newContext({
    viewport: demoConfig.viewport,
    recordVideo: {
      dir: demoConfig.outputDir,
      size: demoConfig.viewport,
    },
  })

  const page = await context.newPage()

  try {
    await login(page)

    for (const segment of demoSegments) {
      const route = `${demoConfig.baseUrl}${resolveSegmentPath(segment)}`
      const durationMs = estimateSegmentDurationMs(segment.narration)

      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await waitForPageSettled(page, segment.readyText)
      await runMotion(page, segment.motion, durationMs)
    }
  } finally {
    const video = page.video()
    await page.close()
    await context.close()
    await browser.close()

    const videoPath = await video?.path()
    if (!videoPath) {
      throw new Error('Playwright did not return a video path.')
    }

    await writeManifest(videoPath)
    console.log(videoPath)
  }
}

await recordDemo()
