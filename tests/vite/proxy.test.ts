import { frappeProxy } from '~/vite/proxy'
import { getCommonSiteConfig } from '~/vite/utils'

vi.mock('~/vite/utils', () => ({
  getCommonSiteConfig: vi.fn(() => null)
}))

describe('frappeProxy', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.FRAPPE_WEB_SERVER_PORT
  })

  it('returns a plugin with the correct name', () => {
    const plugin = frappeProxy()
    expect(plugin.name).toBe('frappe-proxy')
  })

  it('uses default port 8080 when no config is found', () => {
    const plugin = frappeProxy()
    const config = (plugin.config as Function)()
    expect(config.server.port).toBe(8080)
  })

  it('calculates port offset from webserver port', () => {
    vi.mocked(getCommonSiteConfig).mockReturnValue({ webserver_port: 8002 })
    const plugin = frappeProxy()
    const config = (plugin.config as Function)()
    expect(config.server.port).toBe(8082)
  })

  it('uses explicit port when provided', () => {
    const plugin = frappeProxy({ port: 9000 })
    const config = (plugin.config as Function)()
    expect(config.server.port).toBe(9000)
  })

  it('uses env variable for webserver port', () => {
    process.env.FRAPPE_WEB_SERVER_PORT = '8003'
    const plugin = frappeProxy()
    const config = (plugin.config as Function)()
    expect(config.server.port).toBe(8083)
  })

  it('sets up proxy with default source pattern', () => {
    const plugin = frappeProxy()
    const config = (plugin.config as Function)()
    const proxyKeys = Object.keys(config.server.proxy)
    expect(proxyKeys[0]).toContain('desk|app|login|api|assets|files|private')
  })

  it('uses custom source pattern', () => {
    const plugin = frappeProxy({ source: '^/custom' })
    const config = (plugin.config as Function)()
    expect(Object.keys(config.server.proxy)[0]).toBe('^/custom')
  })

  it('enables WebSocket proxying', () => {
    const plugin = frappeProxy()
    const config = (plugin.config as Function)()
    const proxyConfig = Object.values(config.server.proxy)[0] as any
    expect(proxyConfig.ws).toBe(true)
  })
})
