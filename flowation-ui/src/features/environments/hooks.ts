import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { environmentsApi } from './api.ts'
import type {
  EnvironmentCreateRequest,
  EnvironmentUpdateRequest,
  UpsertVariablesRequest,
} from '@/api/types.ts'

/* ── Query Key Factory ───────────────────────────────────── */

export const environmentKeys = {
  all: () => ['environments'] as const,
  detail: (id: string) => ['environments', id] as const,
}

/* ── Hooks ───────────────────────────────────────────────── */

export function useEnvironments() {
  return useQuery({
    queryKey: environmentKeys.all(),
    queryFn: environmentsApi.getAll,
  })
}

export function useEnvironment(id: string) {
  return useQuery({
    queryKey: environmentKeys.detail(id),
    queryFn: () => environmentsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateEnvironment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EnvironmentCreateRequest) => environmentsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: environmentKeys.all() }),
  })
}

export function useUpdateEnvironment(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EnvironmentUpdateRequest) =>
      environmentsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: environmentKeys.all() })
      qc.invalidateQueries({ queryKey: environmentKeys.detail(id) })
    },
  })
}

export function useDeleteEnvironment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => environmentsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: environmentKeys.all() }),
  })
}

export function useUpsertVariables(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpsertVariablesRequest) =>
      environmentsApi.upsertVariables(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: environmentKeys.all() })
      qc.invalidateQueries({ queryKey: environmentKeys.detail(id) })
    },
  })
}
