import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query'
import { flowsApi } from './api.ts'
import type {
  Flow,
  FlowCreateRequest,
  FlowUpdateRequest,
  FlowStep,
  FlowStepCreateRequest,
  FlowStepUpdateRequest,
  ReorderEntry,
  ExtractionRuleCreateRequest,
  ExtractionRuleUpdateRequest,
} from '@/api/types.ts'

/* ── Query Key Factories ─────────────────────────────────── */

export const flowKeys = {
  all: () => ['flows'] as const,
  detail: (id: string) => ['flows', id] as const,
  steps: (flowId: string) => ['flows', flowId, 'steps'] as const,
  rules: (flowId: string, stepId: string) =>
    ['flows', flowId, 'steps', stepId, 'rules'] as const,
  executions: (flowId: string) => ['flows', flowId, 'executions'] as const,
  executionPage: (flowId: string, page: number, size: number) =>
    [...flowKeys.executions(flowId), page, size] as const,
}

/* ── Flows ───────────────────────────────────────────────── */

export function useFlows() {
  return useQuery({
    queryKey: flowKeys.all(),
    queryFn: flowsApi.getAll,
  })
}

export function useFlow(id: string) {
  return useQuery({
    queryKey: flowKeys.detail(id),
    queryFn: () => flowsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateFlow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FlowCreateRequest) => flowsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: flowKeys.all() }),
  })
}

export function useUpdateFlow(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FlowUpdateRequest) => flowsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: flowKeys.all() })
      qc.invalidateQueries({ queryKey: flowKeys.detail(id) })
    },
  })
}

export function useDeleteFlow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => flowsApi.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: flowKeys.all() })
      const previous = qc.getQueryData<Flow[]>(flowKeys.all())
      qc.setQueryData<Flow[]>(flowKeys.all(), (old) => old?.filter((f) => f.id !== id) ?? [])
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous !== undefined) qc.setQueryData(flowKeys.all(), ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: flowKeys.all() }),
  })
}

/* ── Flow Steps ──────────────────────────────────────────── */

export function useMultipleFlowSteps(flowIds: string[]) {
  const results = useQueries({
    queries: flowIds.map((id) => ({
      queryKey: flowKeys.steps(id),
      queryFn: () => flowsApi.getSteps(id),
      enabled: !!id,
    })),
  })

  return useMemo(() => {
    const map = new Map<string, FlowStep[]>()
    flowIds.forEach((id, i) => {
      const data = results[i]?.data
      if (data) map.set(id, data)
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results])
}

export function useFlowSteps(flowId: string) {
  return useQuery({
    queryKey: flowKeys.steps(flowId),
    queryFn: () => flowsApi.getSteps(flowId),
    enabled: !!flowId,
  })
}

export function useAddFlowStep(flowId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FlowStepCreateRequest) => flowsApi.addStep(flowId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: flowKeys.steps(flowId) }),
  })
}

export function useUpdateFlowStep(flowId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ stepId, data }: { stepId: string; data: FlowStepUpdateRequest }) =>
      flowsApi.updateStep(flowId, stepId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: flowKeys.steps(flowId) }),
  })
}

export function useDeleteFlowStep(flowId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (stepId: string) => flowsApi.deleteStep(flowId, stepId),
    onSuccess: () => qc.invalidateQueries({ queryKey: flowKeys.steps(flowId) }),
  })
}

export function useReorderFlowSteps(flowId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entries: ReorderEntry[]) => flowsApi.reorderSteps(flowId, entries),
    onSuccess: () => qc.invalidateQueries({ queryKey: flowKeys.steps(flowId) }),
  })
}

/* ── Extraction Rules ────────────────────────────────────── */

export function useExtractionRules(flowId: string, stepId: string) {
  return useQuery({
    queryKey: flowKeys.rules(flowId, stepId),
    queryFn: () => flowsApi.getRules(flowId, stepId),
    enabled: !!flowId && !!stepId,
  })
}

export function useAddExtractionRule(flowId: string, stepId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ExtractionRuleCreateRequest) =>
      flowsApi.addRule(flowId, stepId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: flowKeys.rules(flowId, stepId) }),
  })
}

export function useUpdateExtractionRule(flowId: string, stepId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      ruleId,
      data,
    }: {
      ruleId: string
      data: ExtractionRuleUpdateRequest
    }) => flowsApi.updateRule(flowId, stepId, ruleId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: flowKeys.rules(flowId, stepId) }),
  })
}

export function useDeleteExtractionRule(flowId: string, stepId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ruleId: string) => flowsApi.deleteRule(flowId, stepId, ruleId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: flowKeys.rules(flowId, stepId) }),
  })
}

/* ── Flow Execution ──────────────────────────────────────── */

export function useExecuteFlow(flowId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (environmentId?: string) => flowsApi.execute(flowId, environmentId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: flowKeys.executions(flowId) }),
  })
}

export function useStartFlowRun(flowId: string) {
  return useMutation({
    mutationFn: (environmentId?: string) => flowsApi.startRun(flowId, environmentId),
  })
}

export function useFlowExecutionHistory(flowId: string, page = 0, size = 20) {
  return useQuery({
    queryKey: flowKeys.executionPage(flowId, page, size),
    queryFn: () => flowsApi.getExecutions(flowId, page, size),
    enabled: !!flowId,
  })
}

export function useTestFlowStep(flowId: string, stepId: string) {
  return useMutation({
    mutationFn: (environmentId?: string) => flowsApi.testStep(flowId, stepId, environmentId),
  })
}
