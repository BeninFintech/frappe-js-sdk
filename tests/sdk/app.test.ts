import { FrappeApp } from '~/app'

describe('frappeApp', () => {
  it('creates an instance with the given URL', () => {
    const app = new FrappeApp('https://test.frappe.cloud')
    expect(app.url).toBe('https://test.frappe.cloud')
  })

  it('sets default name to "FrappeApp"', () => {
    const app = new FrappeApp('https://test.frappe.cloud')
    expect(app.name).toBe('FrappeApp')
  })

  it('accepts a custom name', () => {
    const app = new FrappeApp('https://test.frappe.cloud', undefined, 'MyApp')
    expect(app.name).toBe('MyApp')
  })

  it('defaults useToken to false', () => {
    const app = new FrappeApp('https://test.frappe.cloud')
    expect(app.useToken).toBe(false)
  })

  it('configures token auth when tokenParams provided', () => {
    const app = new FrappeApp('https://test.frappe.cloud', {
      useToken: true,
      token: () => 'my-token',
      type: 'Bearer'
    })
    expect(app.useToken).toBe(true)
    expect(app.token!()).toBe('my-token')
    expect(app.tokenType).toBe('Bearer')
  })

  it('creates an axios instance', () => {
    const app = new FrappeApp('https://test.frappe.cloud')
    expect(app.axios).toBeDefined()
    expect(app.axios.defaults.baseURL).toBe('https://test.frappe.cloud')
  })

  it('returns FrappeAuth from auth()', () => {
    const app = new FrappeApp('https://test.frappe.cloud')
    const auth = app.auth()
    expect(auth).toBeDefined()
    expect(auth.axios).toBe(app.axios)
  })

  it('returns FrappeDB from db()', () => {
    const app = new FrappeApp('https://test.frappe.cloud')
    const db = app.db()
    expect(db).toBeDefined()
    expect(db.axios).toBe(app.axios)
  })

  it('returns FrappeCall from call()', () => {
    const app = new FrappeApp('https://test.frappe.cloud')
    const call = app.call()
    expect(call).toBeDefined()
    expect(call.axios).toBe(app.axios)
  })

  it('returns FrappeFileUpload from file()', () => {
    const app = new FrappeApp('https://test.frappe.cloud')
    const file = app.file()
    expect(file).toBeDefined()
    expect(file.axios).toBe(app.axios)
  })
})
