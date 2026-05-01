import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { batchesApi } from './api.ts'
import type {
  Batch,
  BatchCreateRequest,
  BatchUpdateRequest,
  SetBatchItemsRequest,
  SetBatchDataRowsRequest,
} from '@/api/types.ts'

/* ── Query Key Factory ───────────────────────────────────── */

export const batchKeys = {
  all: () => ['batches'] as const,
  detail: (id: string) => ['batches', id] as const,
  runs: (batchId: string) => ['batches', batchId, 'runs'] as const,
  run: (batchId: string, runId: string) =>
    ['batches', batchId, 'runs', runId] as const,
  runPage: (batchId: string, page: number, size: number) =>
    [...batchKeys.runs(batchId), page, size] as const,
}

/* ── Batches ─────────────────────────────────────────────── */

export function useBatches() {
  return useQuery({
    queryKey: batchKeys.all(),
    queryFn: batchesApi.getAll,
  })
}

export function useBatch(id: string) {
  return useQuery({
    queryKey: batchKeys.detail(id),
    queryFn: () => batchesApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BatchCreateRequest) => batchesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: batchKeys.all() }),
  })
}

export function useUpdateBatch(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BatchUpdateRequest) => batchesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: batchKeys.all() })
      qc.invalidateQueries({ queryKey: batchKeys.detail(id) })
    },
  })
}

export function useDeleteBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => batchesApi.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: batchKeys.all() })
      const previous = qc.getQueryData<Batch[]>(batchKeys.all())
      qc.setQueryData<Batch[]>(batchKeys.all(), (old) => old?.filter((b) => b.id !== id) ?? [])
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous !== undefined) qc.setQueryData(batchKeys.all(), ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: batchKeys.all() }),
  })
}

export function useSetBatchItems(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SetBatchItemsRequest) => batchesApi.setItems(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: batchKeys.detail(id) }),
  })
}

export function useSetBatchDataRows(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SetBatchDataRowsRequest) =>
      batchesApi.setDataRows(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: batchKeys.detail(id) }),
  })
}

/* ── Batch Runs ──────────────────────────────────────────── */

export function useStartBatchRun(batchId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => batchesApi.startRun(batchId),
    onSuccess: () => qc.invalidateQueries({ queryKey: batchKeys.runs(batchId) }),
  })
}

export function useBatchRuns(batchId: string, page = 0, size = 20) {
  return useQuery({
    queryKey: batchKeys.runPage(batchId, page, size),
    queryFn: () => batchesApi.getRuns(batchId, page, size),
    enabled: !!batchId,
  })
}

export function useBatchRun(batchId: string, runId: string, polling: boolean) {
  return useQuery({
    queryKey: batchKeys.run(batchId, runId),
    queryFn: () => batchesApi.getRun(batchId, runId),
    enabled: !!batchId && !!runId,
    refetchInterval: polling ? 1500 : false,
  })
}
