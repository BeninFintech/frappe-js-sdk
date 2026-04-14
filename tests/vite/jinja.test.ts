import { jinjaBootData } from '~/vite/jinja'

describe('jinjaBootData', () => {
  const plugin = jinjaBootData()

  it('returns a plugin with the correct name', () => {
    expect(plugin.name).toBe('jinja-boot-data-plugin')
  })

  it('applies only on build', () => {
    expect(plugin.apply).toBe('build')
  })

  it('injects jinja template before </body> in production', () => {
    const html = '<html><body><div id="app"></div></body></html>'
    const transform = plugin.transformIndexHtml as Function
    const result = transform(html, { server: undefined })

    expect(result).toContain('{% for key in boot %}')
    expect(result).toContain('window["{{ key }}"]')
    expect(result).toContain('{{ boot[key] | tojson }}')
    expect(result).toContain('</body>')
  })

  it('returns html unchanged in dev mode', () => {
    const html = '<html><body><div id="app"></div></body></html>'
    const transform = plugin.transformIndexHtml as Function
    const result = transform(html, { server: true })

    expect(result).toBe(html)
  })
})
