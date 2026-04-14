import { getRequestHeaders } from '~/utils/axios'

describe('getRequestHeaders', () => {
  it('includes default Accept and Content-Type headers', () => {
    const headers = getRequestHeaders()
    expect(headers.Accept).toBe('application/json')
    expect(headers['Content-Type']).toBe('application/json; charset=utf-8')
  })

  it('includes Authorization header when using token', () => {
    const token = () => 'my-secret-token'
    const headers = getRequestHeaders(true, 'Bearer', token)
    expect(headers.Authorization).toBe('Bearer my-secret-token')
  })

  it('supports token type "token"', () => {
    const token = () => 'api_key:api_secret'
    const headers = getRequestHeaders(true, 'token', token)
    expect(headers.Authorization).toBe('token api_key:api_secret')
  })

  it('does not include Authorization when useToken is false', () => {
    const headers = getRequestHeaders(false, 'Bearer', () => 'token')
    expect(headers.Authorization).toBeUndefined()
  })

  it('merges custom headers', () => {
    const headers = getRequestHeaders(false, undefined, undefined, undefined, {
      'X-Custom': 'value'
    })
    expect(headers['X-Custom']).toBe('value')
  })

  it('custom headers override defaults', () => {
    const headers = getRequestHeaders(false, undefined, undefined, undefined, {
      Accept: 'text/plain'
    })
    expect(headers.Accept).toBe('text/plain')
  })
})
