import fs from 'node:fs'
import path from 'node:path'
import { type Plugin } from 'vite'

import { findAppName } from './utils'

export type { BuildConfigOptions } from './utils'

export interface BuildPluginOptions {
  /** Output directory for the build. Auto-detected from Frappe app structure if omitted. */
  outDir?: string
  /** Path to copy the built index.html to (for Frappe's www/ routing). */
  indexHtmlPath?: string
  /** Frontend route path (e.g. '/app'). Used to derive indexHtmlPath when not set explicitly. */
  frontendRoute?: string
  /** Base URL for assets. Auto-detected from outDir if omitted. */
  baseUrl?: string
  /** Whether to empty the output directory before building. Defaults to true. */
  emptyOutDir?: boolean
  /** Whether to generate sourcemaps. Defaults to true. */
  sourcemap?: boolean
}

export function buildConfig(options: BuildPluginOptions = {}): Plugin | undefined {
  const outDir = options.outDir || findOutputDir()
  if (!outDir) {
    console.error(
      '[frappe-build] Could not find build output directory automatically. Please specify it manually.'
    )
    return
  }

  let indexHtmlPath = options.indexHtmlPath
  if (!indexHtmlPath && options.frontendRoute) {
    const appName = findAppName()
    if (appName) {
      const htmlName = options.frontendRoute.replace(/^\//, '')
      indexHtmlPath = `../${appName}/www/${htmlName}.html`
    }
  }

  const merged = {
    outDir,
    emptyOutDir: options.emptyOutDir ?? true,
    sourcemap: options.sourcemap ?? true,
    indexHtmlPath: indexHtmlPath || null,
    baseUrl: options.baseUrl || getBaseUrl(outDir)
  }

  return {
    name: 'frappe-build',
    config(_config, { mode }) {
      const config: Record<string, any> = {
        build: {
          outDir: merged.outDir,
          emptyOutDir: merged.emptyOutDir,
          sourcemap: merged.sourcemap
        }
      }

      if (mode === 'production') {
        config.base = merged.baseUrl

        if (!merged.indexHtmlPath) {
          throw new Error(
            '[frappe-build] indexHtmlPath is required in production mode'
          )
        }
      }

      return config
    },
    writeBundle() {
      if (merged.indexHtmlPath) {
        try {
          const sourceHtml = path.join(merged.outDir, 'index.html')
          if (fs.existsSync(sourceHtml)) {
            const destDir = path.dirname(merged.indexHtmlPath)
            if (!fs.existsSync(destDir))
              fs.mkdirSync(destDir, { recursive: true })

            fs.copyFileSync(sourceHtml, merged.indexHtmlPath)
            // eslint-disable-next-line no-console
            console.log(
              `[frappe-build] Copied index.html to ${merged.indexHtmlPath}`
            )
          }
          else {
            console.error(
              `[frappe-build] Source index.html not found at ${sourceHtml}`
            )
          }
        }
        catch (error) {
          console.error('[frappe-build] Error copying index.html:', error)
        }
      }
    }
  }
}

export { findAppName, findAppsFolder, findBenchPath, getCommonSiteConfig, getConfig, getInstalledAppSites } from './utils'

export default buildConfig

function findOutputDir(): string | null {
  const appDir = findAppDir()
  if (appDir)
    return path.join(appDir, 'public', 'frontend')
  return null
}

function getBaseUrl(outputDir: string): string {
  try {
    if (!outputDir)
      return '/'

    const parts = outputDir.split(path.sep)
    const publicIndex = parts.indexOf('public')

    if (publicIndex > 0) {
      const appName = parts[publicIndex - 1]
      const appsIndex = parts.indexOf('apps')

      if (appsIndex >= 0 && publicIndex > appsIndex + 2) {
        const possibleAppName = parts[appsIndex + 1]
        if (possibleAppName === appName) {
          const subdir = parts[publicIndex + 1] || ''
          return `/assets/${appName}/${subdir}/`
        }
      }

      const subdir = parts[publicIndex + 1] || ''
      return `/assets/${appName}/${subdir}/`
    }

    return '/'
  }
  catch (error) {
    console.error('[frappe-build] Error calculating base URL:', error)
    return '/'
  }
}

function findAppDir(): string | null {
  const currentDir = process.cwd()
  const appDir = path.resolve(currentDir, '..')

  try {
    const directories = fs
      .readdirSync(appDir)
      .filter((item) => fs.statSync(path.join(appDir, item)).isDirectory())

    for (const dir of directories) {
      const dirPath = path.join(appDir, dir)
      try {
        const contents = fs.readdirSync(dirPath)
        if (contents.includes('public') && contents.includes('hooks.py'))
          return dirPath
      }
      catch {
        continue
      }
    }
  }
  catch (error) {
    console.error('[frappe-build] Error finding app directory:', error)
  }

  return null
}
