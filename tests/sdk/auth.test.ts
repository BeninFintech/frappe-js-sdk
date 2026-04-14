import { type AxiosInstance } from 'axios'

import { FrappeAuth } from '~/auth'

function createMockAxios(): AxiosInstance {
  return {
    get: vi.fn(),
    post: vi.fn()
  } as unknown as AxiosInstance
}

describe('frappeAuth', () => {
  let auth: FrappeAuth
  let axios: AxiosInstance

  beforeEach(() => {
    axios = createMockAxios()
    auth = new FrappeAuth('https://test.frappe.cloud', axios)
  })

  describe('loginWithUsernamePassword', () => {
    it('posts credentials to /api/method/login', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { message: 'Logged In', full_name: 'Admin' }
      })

      const result = await auth.loginWithUsernamePassword({
        username: 'admin',
        password: 'admin'
      })

      expect(axios.post).toHaveBeenCalledWith('/api/method/login', {
        usr: 'admin',
        pwd: 'admin',
        otp: undefined,
        tmp_id: undefined,
        device: undefined
      })
      expect(result.message).toBe('Logged In')
    })

    it('throws formatted error on failure', async () => {
      vi.mocked(axios.post).mockRejectedValue({
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { message: 'Invalid credentials' }
        }
      })

      await expect(
        auth.loginWithUsernamePassword({ username: 'bad', password: 'bad' })
      ).rejects.toMatchObject({
        httpStatus: 401,
        message: 'Invalid credentials'
      })
    })
  })

  describe('getLoggedInUser', () => {
    it('fetches the current user', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        data: { message: 'admin@example.com' }
      })

      const user = await auth.getLoggedInUser()
      expect(axios.get).toHaveBeenCalledWith('/api/method/frappe.auth.get_logged_user')
      expect(user).toBe('admin@example.com')
    })
  })

  describe('logout', () => {
    it('posts to /api/method/logout', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: {} })

      await auth.logout()
      expect(axios.post).toHaveBeenCalledWith('/api/method/logout', {})
    })
  })

  describe('forgetPassword', () => {
    it('posts to password reset endpoint', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: {} })

      await auth.forgetPassword('user@example.com')
      expect(axios.post).toHaveBeenCalledWith('/', {
        cmd: 'frappe.core.doctype.user.user.reset_password',
        user: 'user@example.com'
      })
    })
  })
})
