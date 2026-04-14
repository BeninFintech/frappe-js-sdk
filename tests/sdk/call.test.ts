import { type AxiosInstance } from 'axios'

import { FrappeCall } from '~/call'

function createMockAxios(): AxiosInstance {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  } as unknown as AxiosInstance
}

describe('frappeCall', () => {
  let call: FrappeCall
  let axios: AxiosInstance

  beforeEach(() => {
    axios = createMockAxios()
    call = new FrappeCall('https://test.frappe.cloud', axios)
  })

  describe('get', () => {
    it('calls GET /api/method/{path}', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        data: { message: 'ok' }
      })

      const result = await call.get('frappe.client.get_list')
      expect(axios.get).toHaveBeenCalledWith(
        '/api/method/frappe.client.get_list',
        expect.objectContaining({ params: expect.any(URLSearchParams) })
      )
      expect(result.message).toBe('ok')
    })

    it('encodes params as URLSearchParams', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: {} })

      await call.get('my.method', { doctype: 'ToDo', limit: 5 })

      const params = vi.mocked(axios.get).mock.calls[0][1]!.params as URLSearchParams
      expect(params.get('doctype')).toBe('ToDo')
      expect(params.get('limit')).toBe('5')
    })

    it('serializes object params as JSON', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: {} })

      await call.get('my.method', { filters: { status: 'Open' } })

      const params = vi.mocked(axios.get).mock.calls[0][1]!.params as URLSearchParams
      expect(params.get('filters')).toBe(JSON.stringify({ status: 'Open' }))
    })

    it('skips null and undefined params', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: {} })

      await call.get('my.method', { a: null, b: undefined, c: 'yes' })

      const params = vi.mocked(axios.get).mock.calls[0][1]!.params as URLSearchParams
      expect(params.has('a')).toBe(false)
      expect(params.has('b')).toBe(false)
      expect(params.get('c')).toBe('yes')
    })
  })

  describe('post', () => {
    it('calls POST /api/method/{path}', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { message: 'created' }
      })

      const result = await call.post('my.method', { name: 'test' })
      expect(axios.post).toHaveBeenCalledWith('/api/method/my.method', { name: 'test' })
      expect(result.message).toBe('created')
    })
  })

  describe('put', () => {
    it('calls PUT /api/method/{path}', async () => {
      vi.mocked(axios.put).mockResolvedValue({
        data: { message: 'updated' }
      })

      const result = await call.put('my.method', { name: 'test' })
      expect(axios.put).toHaveBeenCalledWith('/api/method/my.method', { name: 'test' })
      expect(result.message).toBe('updated')
    })
  })

  describe('delete', () => {
    it('calls DELETE /api/method/{path}', async () => {
      vi.mocked(axios.delete).mockResolvedValue({
        data: { message: 'deleted' }
      })

      const result = await call.delete('my.method', { name: 'test' })
      expect(axios.delete).toHaveBeenCalledWith('/api/method/my.method', { params: { name: 'test' } })
      expect(result.message).toBe('deleted')
    })
  })

  describe('error handling', () => {
    it('throws formatted error on any method failure', async () => {
      vi.mocked(axios.get).mockRejectedValue({
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { message: 'Something broke', exception: 'ServerError' }
        }
      })

      await expect(call.get('bad.method')).rejects.toMatchObject({
        httpStatus: 500,
        httpStatusText: 'Internal Server Error',
        message: 'Something broke',
        exception: 'ServerError'
      })
    })
  })
})
