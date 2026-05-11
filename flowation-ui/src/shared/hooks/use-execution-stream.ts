import { useState, useEffect } from 'react'
import type { ExecutionStatus, BatchRunStatus, BatchItemType } from '@/api/types.ts'

export interface SseStepEvent {
  stepIndex: number
  stepRefId: string | null
  status: ExecutionStatus
  requestSnapshot: Record<string, unknown> | null
  responseSnapshot: Record<string, unknown> | null
  errorMessage: string | null
  durationMs: number | null
  startedAt: string | null
  completedAt: string | null
}

export interface StreamState {
  isStreaming: boolean
  runStatus: ExecutionStatus | null
  steps: SseStepEvent[]
  totalDurationMs: number | null
  completedAt: string | null
}

/* ─── Batch SSE ──────────────────────────────────────── */

export interface SseBatchItemEvent {
  itemType: BatchItemType
  referenceId: string
  name: string | null
  executionRunId: string
  status: ExecutionStatus
  durationMs: number | null
}

export interface BatchStreamState {
  isStreaming: boolean
  runStatus: BatchRunStatus | null
  items: SseBatchItemEvent[]
}

export function useBatchRunStream(batchId: string, runId: string | null): BatchStreamState {
  const [state, setState] = useState<BatchStreamState>({
    isStreaming: false,
    runStatus: null,
    items: [],
  })

  useEffect(() => {
    if (!runId) return

    setState({ isStreaming: true, runStatus: null, items: [] })

    const es = new EventSource(`/api/batches/${batchId}/runs/${runId}/stream`)

    es.addEventListener('item-completed', (e) => {
      const item = JSON.parse((e as MessageEvent).data) as SseBatchItemEvent
      setState((prev) => ({ ...prev, items: [...prev.items, item] }))
    })

    es.addEventListener('run-completed', (e) => {
      const event = JSON.parse((e as MessageEvent).data) as {
        runId: string
        batchId: string
        status: BatchRunStatus
      }
      setState((prev) => ({ ...prev, isStreaming: false, runStatus: event.status }))
      es.close()
    })

    es.onerror = () => {
      setState((prev) => ({ ...prev, isStreaming: false }))
      es.close()
    }

    return () => es.close()
  }, [runId])

  return state
}

/* ─── Flow / Operation SSE ───────────────────────────── */

export function useExecutionStream(runId: string | null): StreamState {
  const [state, setState] = useState<StreamState>({
    isStreaming: false,
    runStatus: null,
    steps: [],
    totalDurationMs: null,
    completedAt: null,
  })

  useEffect(() => {
    if (!runId) return

    setState({ isStreaming: true, runStatus: 'RUNNING', steps: [], totalDurationMs: null, completedAt: null })

    const es = new EventSource(`/api/executions/${runId}/stream`)

    es.addEventListener('step-completed', (e) => {
      const step = JSON.parse((e as MessageEvent).data) as SseStepEvent
      setState((prev) => ({ ...prev, steps: [...prev.steps, step] }))
    })

    es.addEventListener('run-completed', (e) => {
      const event = JSON.parse((e as MessageEvent).data) as {
        runId: string
        status: ExecutionStatus
        totalDurationMs: number
        completedAt: string
      }
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        runStatus: event.status,
        totalDurationMs: event.totalDurationMs,
        completedAt: event.completedAt,
      }))
      es.close()
    })

    es.onerror = () => {
      setState((prev) => ({ ...prev, isStreaming: false }))
      es.close()
    }

    return () => es.close()
  }, [runId])

  return state
}
