import { api } from './client.ts'
import type {
  Environment,
  EnvironmentCreateRequest,
  EnvironmentUpdateRequest,
  UpsertVariablesRequest,
} from './types.ts'

export const environmentsApi = {
  getAll: () => api.get('environments').json<Environment[]>(),

  getById: (id: string) => api.get(`environments/${id}`).json<Environment>(),

  create: (data: EnvironmentCreateRequest) =>
    api.post('environments', { json: data }).json<Environment>(),

  update: (id: string, data: EnvironmentUpdateRequest) =>
    api.put(`environments/${id}`, { json: data }).json<Environment>(),

  delete: (id: string) => api.delete(`environments/${id}`),

  upsertVariables: (id: string, data: UpsertVariablesRequest) =>
    api.put(`environments/${id}/variables`, { json: data }).json<Environment>(),
}
