import ky from 'ky'
import { ApiError } from '@/shared/lib/api-error.ts'

export const api = ky.create({
  prefixUrl: '/api',
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
  hooks: {
    afterResponse: [
      async (_request, _options, response) => {
        if (!response.ok) {
          let message = `Request failed with status ${response.status}`
          let fields: Record<string, string> | undefined

          try {
            const body = (await response.clone().json()) as Record<string, unknown>
            if (typeof body.message === 'string') message = body.message
            if (body.fields && typeof body.fields === 'object') {
              fields = body.fields as Record<string, string>
            }
          } catch {
            // response body is not JSON — keep generic message
          }

          throw new ApiError(message, response.status, fields)
        }
        return response
      },
    ],
  },
})
