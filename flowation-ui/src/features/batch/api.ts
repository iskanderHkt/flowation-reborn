import { api } from '@/api/client.ts'
import type {
  Batch,
  BatchCreateRequest,
  BatchUpdateRequest,
  SetBatchItemsRequest,
  SetBatchDataRowsRequest,
  BatchRun,
  BatchStartResponse,
  PageResult,
} from '@/api/types.ts'

export const batchesApi = {
  /* ── Batches ─────────────────────────────────────── */
  getAll: () => api.get('batches').json<Batch[]>(),

  getById: (id: string) => api.get(`batches/${id}`).json<Batch>(),

  create: (data: BatchCreateRequest) =>
    api.post('batches', { json: data }).json<Batch>(),

  update: (id: string, data: BatchUpdateRequest) =>
    api.put(`batches/${id}`, { json: data }).json<Batch>(),

  delete: (id: string) => api.delete(`batches/${id}`),

  setItems: (id: string, data: SetBatchItemsRequest) =>
    api.put(`batches/${id}/items`, { json: data }).json<Batch>(),

  setDataRows: (id: string, data: SetBatchDataRowsRequest) =>
    api.put(`batches/${id}/data-rows`, { json: data }).json<Batch>(),

  /* ── Batch Runs ──────────────────────────────────── */
  startRun: (batchId: string, environmentId?: string) =>
    api.post(`batches/${batchId}/runs`, {
      json: { environmentId: environmentId ?? null, inputVariables: {} },
    }).json<BatchStartResponse>(),

  getRuns: (batchId: string, page = 0, size = 20) =>
    api
      .get(`batches/${batchId}/runs`, { searchParams: { page, size } })
      .json<PageResult<BatchRun>>(),

  getRun: (batchId: string, runId: string) =>
    api.get(`batches/${batchId}/runs/${runId}`).json<BatchRun>(),
}
