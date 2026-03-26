import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { operationsApi } from '@/api/operations.ts'
import type { OperationCreateRequest, OperationUpdateRequest } from '@/api/types.ts'

const KEYS = {
  all: ['operations'] as const,
  detail: (id: string) => ['operations', id] as const,
  executions: (id: string) => ['operations', id, 'executions'] as const,
}

export function useOperations() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: operationsApi.getAll,
  })
}

export function useOperation(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => operationsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateOperation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: OperationCreateRequest) => operationsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useUpdateOperation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: OperationUpdateRequest) => operationsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
      qc.invalidateQueries({ queryKey: KEYS.detail(id) })
    },
  })
}

export function useDeleteOperation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => operationsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useExecuteOperation(operationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => operationsApi.execute(operationId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: KEYS.executions(operationId) }),
  })
}

export function useExecutionHistory(operationId: string) {
  return useQuery({
    queryKey: KEYS.executions(operationId),
    queryFn: () => operationsApi.getExecutions(operationId),
    enabled: !!operationId,
  })
}
