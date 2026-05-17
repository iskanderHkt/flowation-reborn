import { api } from '@/api/client.ts'
import type { Schedule, ScheduleCreateRequest, ScheduleUpdateRequest } from '@/api/types.ts'

export const schedulesApi = {
  getAll: () => api.get('schedules').json<Schedule[]>(),

  getById: (id: string) => api.get(`schedules/${id}`).json<Schedule>(),

  create: (data: ScheduleCreateRequest) =>
    api.post('schedules', { json: data }).json<Schedule>(),

  update: (id: string, data: ScheduleUpdateRequest) =>
    api.put(`schedules/${id}`, { json: data }).json<Schedule>(),

  delete: (id: string) => api.delete(`schedules/${id}`),

  pause: (id: string) => api.patch(`schedules/${id}/pause`).json<Schedule>(),

  resume: (id: string) => api.patch(`schedules/${id}/resume`).json<Schedule>(),
}
