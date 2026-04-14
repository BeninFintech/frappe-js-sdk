import { type Plugin } from 'vite'

import { buildConfig, type BuildPluginOptions } from './build'
import { jinjaBootData } from './jinja'
import { frappeProxy, type FrappeProxyOptions } from './proxy'
import { frappeTypes, type FrappeTypesOptions } from './types'

export interface FrappePluginOptions {
  /** Frontend route path (e.g. '/app'). Passed to the build plugin for indexHtml resolution. */
  frontendRoute?: string

  /** Dev proxy plugin. Pass `true` (default), `false` to disable, or an options object. */
  proxy?: boolean | FrappeProxyOptions

  /** Jinja boot data injection plugin. Pass `true` (default) or `false` to disable. */
  jinja?: boolean

  /** Build config plugin. Pass `true` (default), `false` to disable, or an options object. */
  build?: boolean | BuildPluginOptions

  /** Frappe DocType type generation plugin. Pass options to enable, or omit/`false` to disable. */
  types?: FrappeTypesOptions | false
}

export function frappe(options: FrappePluginOptions = {}): Plugin[] {
  const plugins: Plugin[] = []
  const { frontendRoute } = options

  const proxyOpt = options.proxy ?? true
  const jinjaOpt = options.jinja ?? true
  const buildOpt = options.build ?? true

  if (proxyOpt) {
    const proxyOptions = typeof proxyOpt === 'object' ? proxyOpt : {}
    plugins.push(frappeProxy(proxyOptions))
  }

  if (options.types) {
    plugins.push(frappeTypes(options.types))
  }

  if (jinjaOpt) {
    plugins.push(jinjaBootData())
  }

  if (buildOpt) {
    const buildOptions = typeof buildOpt === 'object' ? buildOpt : {}
    const plugin = buildConfig({ frontendRoute, ...buildOptions })
    if (plugin)
      plugins.push(plugin)
  }

  if (frontendRoute) {
    plugins.push({
      name: 'frappe-define-frontend-route',
      config() {
        return {
          define: {
            __FRONTEND_ROUTE__: JSON.stringify(frontendRoute)
          }
        }
      }
    })
  }

  return plugins
}

export { buildConfig } from './build'
export type { BuildConfigOptions, BuildPluginOptions } from './build'
export { jinjaBootData } from './jinja'
export { frappeProxy } from './proxy'
export type { FrappeProxyOptions } from './proxy'

export { frappeTypes, generateDocTypes } from './types'
export type { FrappeAppMap, FrappeTypesInput, FrappeTypesOptions, GenerationSummary } from './types'
export { findAppName, findAppsFolder, findBenchPath, getCommonSiteConfig, getConfig, getInstalledAppSites } from './utils'

export default frappe
