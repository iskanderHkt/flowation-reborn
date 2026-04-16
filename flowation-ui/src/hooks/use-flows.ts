import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query'
import { flowsApi } from '@/api/flows.ts'
import type {
  FlowCreateRequest,
  FlowUpdateRequest,
  FlowStep,
  FlowStepCreateRequest,
  FlowStepUpdateRequest,
  ReorderEntry,
  ExtractionRuleCreateRequest,
  ExtractionRuleUpdateRequest,
} from '@/api/types.ts'

const KEYS = {
  all: ['flows'] as const,
  detail: (id: string) => ['flows', id] as const,
  steps: (flowId: string) => ['flows', flowId, 'steps'] as const,
  rules: (flowId: string, stepId: string) => ['flows', flowId, 'steps', stepId, 'rules'] as const,
  executions: (flowId: string) => ['flows', flowId, 'executions'] as const,
}

/* ── Flows ──────────────────────────────────────────── */

export function useFlows() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: flowsApi.getAll,
  })
}

export function useFlow(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => flowsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateFlow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FlowCreateRequest) => flowsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useUpdateFlow(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FlowUpdateRequest) => flowsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
      qc.invalidateQueries({ queryKey: KEYS.detail(id) })
    },
  })
}

export function useDeleteFlow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => flowsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

/* ── Flow Steps ─────────────────────────────────────── */

export function useMultipleFlowSteps(flowIds: string[]) {
  const results = useQueries({
    queries: flowIds.map((id) => ({
      queryKey: KEYS.steps(id),
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
    // results is stable per-query from TanStack cache; flowIds drives which queries run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results])
}

export function useFlowSteps(flowId: string) {
  return useQuery({
    queryKey: KEYS.steps(flowId),
    queryFn: () => flowsApi.getSteps(flowId),
    enabled: !!flowId,
  })
}

export function useAddFlowStep(flowId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FlowStepCreateRequest) => flowsApi.addStep(flowId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.steps(flowId) }),
  })
}

export function useUpdateFlowStep(flowId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ stepId, data }: { stepId: string; data: FlowStepUpdateRequest }) =>
      flowsApi.updateStep(flowId, stepId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.steps(flowId) }),
  })
}

export function useDeleteFlowStep(flowId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (stepId: string) => flowsApi.deleteStep(flowId, stepId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.steps(flowId) }),
  })
}

export function useReorderFlowSteps(flowId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entries: ReorderEntry[]) => flowsApi.reorderSteps(flowId, entries),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.steps(flowId) }),
  })
}

/* ── Extraction Rules ───────────────────────────────── */

export function useExtractionRules(flowId: string, stepId: string) {
  return useQuery({
    queryKey: KEYS.rules(flowId, stepId),
    queryFn: () => flowsApi.getRules(flowId, stepId),
    enabled: !!flowId && !!stepId,
  })
}

export function useAddExtractionRule(flowId: string, stepId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ExtractionRuleCreateRequest) =>
      flowsApi.addRule(flowId, stepId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.rules(flowId, stepId) }),
  })
}

export function useUpdateExtractionRule(flowId: string, stepId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ruleId, data }: { ruleId: string; data: ExtractionRuleUpdateRequest }) =>
      flowsApi.updateRule(flowId, stepId, ruleId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.rules(flowId, stepId) }),
  })
}

export function useDeleteExtractionRule(flowId: string, stepId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ruleId: string) => flowsApi.deleteRule(flowId, stepId, ruleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.rules(flowId, stepId) }),
  })
}

/* ── Flow Execution ─────────────────────────────────── */

export function useExecuteFlow(flowId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (environmentId?: string) => flowsApi.execute(flowId, environmentId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: KEYS.executions(flowId) }),
  })
}

export function useFlowExecutionHistory(flowId: string, page = 0, size = 20) {
  return useQuery({
    queryKey: [...KEYS.executions(flowId), page, size],
    queryFn: () => flowsApi.getExecutions(flowId, page, size),
    enabled: !!flowId,
  })
}

export function useTestFlowStep(flowId: string, stepId: string) {
  return useMutation({
    mutationFn: () => flowsApi.testStep(flowId, stepId),
  })
}
