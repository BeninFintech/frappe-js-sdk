import { frappe } from '~/vite/index'

vi.mock('~/vite/utils', () => ({
  getCommonSiteConfig: vi.fn(() => null),
  findAppName: vi.fn(() => 'testapp'),
  findBenchPath: vi.fn(() => null),
  findAppsFolder: vi.fn(() => null),
  getConfig: vi.fn(),
  getInstalledAppSites: vi.fn(async () => [])
}))

describe('frappe unified plugin', () => {
  it('returns an array of plugins', () => {
    const plugins = frappe()
    expect(Array.isArray(plugins)).toBe(true)
    expect(plugins.length).toBeGreaterThan(0)
  })

  it('includes proxy, jinja, and build plugins by default', () => {
    const plugins = frappe()
    const names = plugins.map((p) => p.name)
    expect(names).toContain('frappe-proxy')
    expect(names).toContain('jinja-boot-data-plugin')
  })

  it('excludes proxy when disabled', () => {
    const plugins = frappe({ proxy: false })
    const names = plugins.map((p) => p.name)
    expect(names).not.toContain('frappe-proxy')
  })

  it('excludes jinja when disabled', () => {
    const plugins = frappe({ jinja: false })
    const names = plugins.map((p) => p.name)
    expect(names).not.toContain('jinja-boot-data-plugin')
  })

  it('excludes build when disabled', () => {
    const plugins = frappe({ build: false })
    const names = plugins.map((p) => p.name)
    expect(names).not.toContain('frappe-build')
  })

  it('does not include types plugin by default', () => {
    const plugins = frappe()
    const names = plugins.map((p) => p.name)
    expect(names).not.toContain('frappe-types')
  })

  it('includes types plugin when options provided', () => {
    const plugins = frappe({
      types: { input: { myapp: ['*'] } }
    })
    const names = plugins.map((p) => p.name)
    expect(names).toContain('frappe-types')
  })

  it('adds frontend route define plugin when frontendRoute is set', () => {
    const plugins = frappe({ frontendRoute: '/app' })
    const definePlugin = plugins.find((p) => p.name === 'frappe-define-frontend-route')
    expect(definePlugin).toBeDefined()

    const config = (definePlugin!.config as Function)()
    expect(config.define.__FRONTEND_ROUTE__).toBe(JSON.stringify('/app'))
  })

  it('does not add frontend route plugin when frontendRoute is omitted', () => {
    const plugins = frappe()
    const names = plugins.map((p) => p.name)
    expect(names).not.toContain('frappe-define-frontend-route')
  })

  it('passes proxy options through', () => {
    const plugins = frappe({ proxy: { port: 9999 } })
    const proxyPlugin = plugins.find((p) => p.name === 'frappe-proxy')
    expect(proxyPlugin).toBeDefined()
    const config = (proxyPlugin!.config as Function)()
    expect(config.server.port).toBe(9999)
  })
})
