import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { batchesApi } from '@/api/batches.ts'
import type {
  BatchCreateRequest,
  BatchUpdateRequest,
  SetBatchItemsRequest,
  SetBatchDataRowsRequest,
} from '@/api/types.ts'

const KEYS = {
  all: ['batches'] as const,
  detail: (id: string) => ['batches', id] as const,
  runs: (batchId: string) => ['batches', batchId, 'runs'] as const,
  run: (batchId: string, runId: string) => ['batches', batchId, 'runs', runId] as const,
}

/* ── Batches ─────────────────────────────────────────── */

export function useBatches() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: batchesApi.getAll,
  })
}

export function useBatch(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => batchesApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BatchCreateRequest) => batchesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useUpdateBatch(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BatchUpdateRequest) => batchesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
      qc.invalidateQueries({ queryKey: KEYS.detail(id) })
    },
  })
}

export function useDeleteBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => batchesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useSetBatchItems(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SetBatchItemsRequest) => batchesApi.setItems(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(id) }),
  })
}

export function useSetBatchDataRows(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SetBatchDataRowsRequest) => batchesApi.setDataRows(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(id) }),
  })
}

/* ── Batch Runs ──────────────────────────────────────── */

export function useStartBatchRun(batchId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => batchesApi.startRun(batchId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.runs(batchId) }),
  })
}

export function useBatchRuns(batchId: string, page = 0, size = 20) {
  return useQuery({
    queryKey: [...KEYS.runs(batchId), page, size],
    queryFn: () => batchesApi.getRuns(batchId, page, size),
    enabled: !!batchId,
  })
}

export function useBatchRun(batchId: string, runId: string, polling: boolean) {
  return useQuery({
    queryKey: KEYS.run(batchId, runId),
    queryFn: () => batchesApi.getRun(batchId, runId),
    enabled: !!batchId && !!runId,
    refetchInterval: polling ? 1500 : false,
  })
}
