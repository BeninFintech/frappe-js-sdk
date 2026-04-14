import { type Plugin } from 'vite'

import { getCommonSiteConfig } from './utils'

export interface FrappeProxyOptions {
  /** Vite dev server port. Auto-calculated from webserver port if omitted. */
  port?: number
  /** Regex pattern for routes to proxy to the Frappe backend. */
  source?: string
}

export function frappeProxy(options: FrappeProxyOptions = {}): Plugin {
  const {
    source = '^/(desk|app|login|api|assets|files|private)'
  } = options
  let { port } = options

  const commonSiteConfig = getCommonSiteConfig()
  const envPort = process.env.FRAPPE_WEB_SERVER_PORT
  const webserverPort = Number(envPort) || (commonSiteConfig?.webserver_port as number) || 8000

  if (!port) {
    const baseWebServerPort = 8000
    const baseVitePort = 8080
    port = baseVitePort + (webserverPort - baseWebServerPort)
  }

  if (envPort) {
    // eslint-disable-next-line no-console
    console.log(`[frappe-proxy] Using web server port from environment: ${envPort}`)
  }

  if (!commonSiteConfig) {
    // eslint-disable-next-line no-console
    console.log('[frappe-proxy] No common_site_config.json found, using default port 8000')
  }

  const proxy: Record<string, any> = {
    [source]: {
      target: `http://127.0.0.1:${webserverPort}`,
      ws: true,
      router(req: any) {
        const siteName = req.headers.host.split(':')[0]
        return `http://${siteName}:${webserverPort}`
      }
    }
  }

  return {
    name: 'frappe-proxy',
    config: () => ({
      server: {
        port,
        proxy
      }
    })
  }
}

export default frappeProxy
