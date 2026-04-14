import { type AxiosInstance } from 'axios'

import { FrappeDB } from '~/db'

function createMockAxios(): AxiosInstance {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  } as unknown as AxiosInstance
}

describe('frappeDB', () => {
  let db: FrappeDB
  let axios: AxiosInstance

  beforeEach(() => {
    axios = createMockAxios()
    db = new FrappeDB('https://test.frappe.cloud', axios)
  })

  describe('getDoc', () => {
    it('calls GET /api/resource/{doctype}/{docname}', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        data: { data: { name: 'DOC-001', title: 'Test' } }
      })

      const result = await db.getDoc('ToDo', 'DOC-001')
      expect(axios.get).toHaveBeenCalledWith('/api/resource/ToDo/DOC-001')
      expect(result.name).toBe('DOC-001')
    })

    it('encodes docname in URL', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        data: { data: { name: 'a/b' } }
      })

      await db.getDoc('ToDo', 'a/b')
      expect(axios.get).toHaveBeenCalledWith('/api/resource/ToDo/a%2Fb')
    })

    it('throws formatted error on failure', async () => {
      vi.mocked(axios.get).mockRejectedValue({
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { exception: 'DoesNotExistError' }
        }
      })

      await expect(db.getDoc('ToDo', 'MISSING')).rejects.toMatchObject({
        httpStatus: 404,
        httpStatusText: 'Not Found'
      })
    })
  })

  describe('getDocList', () => {
    it('calls GET /api/resource/{doctype} with no args', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        data: { data: [{ name: 'DOC-001' }] }
      })

      const result = await db.getDocList('ToDo')
      expect(axios.get).toHaveBeenCalledWith('/api/resource/ToDo', { params: {} })
      expect(result).toHaveLength(1)
    })

    it('passes filters and limit as params', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        data: { data: [] }
      })

      await db.getDocList('ToDo', {
        filters: [['status', '=', 'Open']],
        limit: 5
      })

      const params = vi.mocked(axios.get).mock.calls[0][1]!.params
      expect(params.filters).toBe(JSON.stringify([['status', '=', 'Open']]))
      expect(params.limit).toBe(5)
    })

    it('builds orderBy string', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        data: { data: [] }
      })

      await db.getDocList('ToDo', {
        orderBy: { field: 'creation', order: 'desc' }
      })

      const params = vi.mocked(axios.get).mock.calls[0][1]!.params
      expect(params.order_by).toBe('creation desc')
    })
  })

  describe('createDoc', () => {
    it('calls POST /api/resource/{doctype}', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { data: { name: 'NEW-001', title: 'New Doc' } }
      })

      const result = await db.createDoc('ToDo', { title: 'New Doc' })
      expect(axios.post).toHaveBeenCalledWith('/api/resource/ToDo', { title: 'New Doc' })
      expect(result.name).toBe('NEW-001')
    })
  })

  describe('updateDoc', () => {
    it('calls PUT /api/resource/{doctype}/{docname}', async () => {
      vi.mocked(axios.put).mockResolvedValue({
        data: { data: { name: 'DOC-001', title: 'Updated' } }
      })

      const result = await db.updateDoc('ToDo', 'DOC-001', { title: 'Updated' })
      expect(axios.put).toHaveBeenCalledWith('/api/resource/ToDo/DOC-001', { title: 'Updated' })
      expect(result.title).toBe('Updated')
    })
  })

  describe('deleteDoc', () => {
    it('calls DELETE /api/resource/{doctype}/{docname}', async () => {
      vi.mocked(axios.delete).mockResolvedValue({
        data: { message: 'ok' }
      })

      const result = await db.deleteDoc('ToDo', 'DOC-001')
      expect(axios.delete).toHaveBeenCalledWith('/api/resource/ToDo/DOC-001')
      expect(result.message).toBe('ok')
    })
  })

  describe('getCount', () => {
    it('calls GET frappe.client.get_count', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        data: { message: 42 }
      })

      const result = await db.getCount('ToDo')
      expect(axios.get).toHaveBeenCalledWith(
        '/api/method/frappe.client.get_count',
        expect.objectContaining({ params: expect.objectContaining({ doctype: 'ToDo' }) })
      )
      expect(result).toBe(42)
    })
  })

  describe('setValue', () => {
    it('calls POST frappe.client.set_value', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { name: 'DOC-001' }
      })

      await db.setValue('ToDo', 'DOC-001', 'status', 'Closed')
      expect(axios.post).toHaveBeenCalledWith(
        '/api/method/frappe.client.set_value',
        { doctype: 'ToDo', name: 'DOC-001', fieldname: 'status', value: 'Closed' }
      )
    })
  })

  describe('submit', () => {
    it('calls POST frappe.client.submit', async () => {
      const doc = { doctype: 'Sales Invoice', name: 'INV-001' }
      vi.mocked(axios.post).mockResolvedValue({
        data: { message: { name: 'INV-001', docstatus: 1 } }
      })

      const result = await db.submit(doc)
      expect(axios.post).toHaveBeenCalledWith(
        '/api/method/frappe.client.submit',
        { doc }
      )
      expect(result.docstatus).toBe(1)
    })
  })

  describe('cancel', () => {
    it('calls POST frappe.client.cancel', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { name: 'INV-001', docstatus: 2 }
      })

      await db.cancel('Sales Invoice', 'INV-001')
      expect(axios.post).toHaveBeenCalledWith(
        '/api/method/frappe.client.cancel',
        { doctype: 'Sales Invoice', name: 'INV-001' }
      )
    })
  })
})
