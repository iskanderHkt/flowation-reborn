import ky from 'ky'

export const api = ky.create({
  prefixUrl: '/api',
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
})
