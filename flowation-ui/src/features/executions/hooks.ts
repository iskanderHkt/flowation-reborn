import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useOperations } from '@/features/catalog/hooks.ts'
import { useFlows } from '@/features/flows/hooks.ts'
import { useBatches } from '@/features/batch/hooks.ts'
import { operationsApi } from '@/features/catalog/api.ts'
import { flowsApi } from '@/features/flows/api.ts'
import { batchesApi } from '@/features/batch/api.ts'
import type { ExecutionResult, FlowExecutionResult, BatchRun } from '@/api/types.ts'

export type EntityType = 'OPERATION' | 'FLOW' | 'BATCH'

export interface UnifiedExecution {
  runId: string
  entityType: EntityType
  entityId: string
  entityName: string
  status: string
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  raw: ExecutionResult | FlowExecutionResult | BatchRun
}

const HISTORY_SIZE = 50

export function useAllExecutions() {
  const { data: operations = [], isLoading: opsLoading } = useOperations()
  const { data: flows = [], isLoading: flowsLoading } = useFlows()
  const { data: batches = [], isLoading: batchesLoading } = useBatches()

  const opHistoryQueries = useQueries({
    queries: operations.map((op) => ({
      queryKey: ['operations', op.id, 'executions', 0, HISTORY_SIZE],
      queryFn: () => operationsApi.getExecutions(op.id, 0, HISTORY_SIZE),
      enabled: operations.length > 0,
    })),
  })

  const flowHistoryQueries = useQueries({
    queries: flows.map((flow) => ({
      queryKey: ['flows', flow.id, 'executions', 0, HISTORY_SIZE],
      queryFn: () => flowsApi.getExecutions(flow.id, 0, HISTORY_SIZE),
      enabled: flows.length > 0,
    })),
  })

  const batchRunQueries = useQueries({
    queries: batches.map((batch) => ({
      queryKey: ['batches', batch.id, 'runs', 0, HISTORY_SIZE],
      queryFn: () => batchesApi.getRuns(batch.id, 0, HISTORY_SIZE),
      enabled: batches.length > 0,
    })),
  })

  const isLoading =
    opsLoading ||
    flowsLoading ||
    batchesLoading ||
    opHistoryQueries.some((q) => q.isLoading) ||
    flowHistoryQueries.some((q) => q.isLoading) ||
    batchRunQueries.some((q) => q.isLoading)

  const executions = useMemo<UnifiedExecution[]>(() => {
    const results: UnifiedExecution[] = []

    operations.forEach((op, i) => {
      const page = opHistoryQueries[i]?.data
      if (!page) return
      page.content.forEach((exec) => {
        results.push({
          runId: exec.runId,
          entityType: 'OPERATION',
          entityId: op.id,
          entityName: op.name,
          status: exec.status,
          startedAt: exec.startedAt,
          completedAt: exec.completedAt,
          durationMs: exec.durationMs,
          raw: exec,
        })
      })
    })

    flows.forEach((flow, i) => {
      const page = flowHistoryQueries[i]?.data
      if (!page) return
      page.content.forEach((exec) => {
        results.push({
          runId: exec.runId,
          entityType: 'FLOW',
          entityId: flow.id,
          entityName: flow.name,
          status: exec.status,
          startedAt: exec.startedAt,
          completedAt: exec.completedAt,
          durationMs: exec.totalDurationMs,
          raw: exec,
        })
      })
    })

    batches.forEach((batch, i) => {
      const page = batchRunQueries[i]?.data
      if (!page) return
      page.content.forEach((run) => {
        results.push({
          runId: run.id,
          entityType: 'BATCH',
          entityId: batch.id,
          entityName: batch.name,
          status: run.status,
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          durationMs: null,
          raw: run,
        })
      })
    })

    return results.sort((a, b) => {
      if (!a.startedAt) return 1
      if (!b.startedAt) return -1
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    })
  }, [operations, flows, batches, opHistoryQueries, flowHistoryQueries, batchRunQueries])

  return { executions, isLoading }
}
