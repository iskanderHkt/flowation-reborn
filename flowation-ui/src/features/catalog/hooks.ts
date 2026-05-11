import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { operationsApi, groupsApi } from './api.ts'
import type {
  Operation,
  OperationCreateRequest,
  OperationUpdateRequest,
  OperationGroupCreateRequest,
  OperationGroupUpdateRequest,
} from '@/api/types.ts'

/* ── Query Key Factories ─────────────────────────────────── */

export const operationKeys = {
  all: () => ['operations'] as const,
  detail: (id: string) => ['operations', id] as const,
  executions: (id: string) => ['operations', id, 'executions'] as const,
  executionPage: (id: string, page: number, size: number) =>
    [...operationKeys.executions(id), page, size] as const,
}

export const groupKeys = {
  all: () => ['operation-groups'] as const,
}

/* ── Operations ──────────────────────────────────────────── */

export function useOperations() {
  return useQuery({
    queryKey: operationKeys.all(),
    queryFn: operationsApi.getAll,
  })
}

export function useOperation(id: string) {
  return useQuery({
    queryKey: operationKeys.detail(id),
    queryFn: () => operationsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateOperation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: OperationCreateRequest) => operationsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: operationKeys.all() }),
  })
}

export function useUpdateOperation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: OperationUpdateRequest) => operationsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: operationKeys.all() })
      qc.invalidateQueries({ queryKey: operationKeys.detail(id) })
    },
  })
}

export function useDeleteOperation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => operationsApi.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: operationKeys.all() })
      const previous = qc.getQueryData<Operation[]>(operationKeys.all())
      qc.setQueryData<Operation[]>(operationKeys.all(), (old) => old?.filter((op) => op.id !== id) ?? [])
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous !== undefined) qc.setQueryData(operationKeys.all(), ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: operationKeys.all() }),
  })
}

export function useExecuteOperation(operationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (environmentId?: string) =>
      operationsApi.execute(operationId, environmentId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: operationKeys.executions(operationId) }),
  })
}

export function useStartOperationRun(operationId: string) {
  return useMutation({
    mutationFn: (environmentId?: string) =>
      operationsApi.startRun(operationId, environmentId),
  })
}

export function useExecutionHistory(operationId: string, page = 0, size = 20) {
  return useQuery({
    queryKey: operationKeys.executionPage(operationId, page, size),
    queryFn: () => operationsApi.getExecutions(operationId, page, size),
    enabled: !!operationId,
  })
}

/* ── Operation Groups ────────────────────────────────────── */

export function useGroups() {
  return useQuery({
    queryKey: groupKeys.all(),
    queryFn: groupsApi.getAll,
  })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: OperationGroupCreateRequest) => groupsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.all() }),
  })
}

export function useUpdateGroup(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: OperationGroupUpdateRequest) => groupsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.all() }),
  })
}

export function useDeleteGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => groupsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupKeys.all() })
      qc.invalidateQueries({ queryKey: operationKeys.all() })
    },
  })
}
