import { api } from './client.ts'
import type {
  Operation,
  OperationCreateRequest,
  OperationUpdateRequest,
  ExecutionResult,
  PageResult,
} from './types.ts'

export const operationsApi = {
  getAll: () => api.get('operations').json<Operation[]>(),

  getById: (id: string) => api.get(`operations/${id}`).json<Operation>(),

  create: (data: OperationCreateRequest) =>
    api.post('operations', { json: data }).json<Operation>(),

  update: (id: string, data: OperationUpdateRequest) =>
    api.put(`operations/${id}`, { json: data }).json<Operation>(),

  delete: (id: string) => api.delete(`operations/${id}`),

  execute: (id: string, environmentId?: string) =>
    api.post(`operations/${id}/execute`, {
      searchParams: environmentId ? { environmentId } : {},
    }).json<ExecutionResult>(),

  getExecutions: (id: string, page = 0, size = 20) =>
    api.get(`operations/${id}/executions`, { searchParams: { page, size } }).json<PageResult<ExecutionResult>>(),
}
