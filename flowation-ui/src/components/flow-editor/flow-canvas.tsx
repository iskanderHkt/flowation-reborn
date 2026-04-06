import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { OperationStepNode } from './operation-step-node.tsx'
import { FlowStepNode } from './flow-step-node.tsx'
import { AddStepNode } from './add-step-node.tsx'
import type { FlowStep, Operation, Flow, ExecutionStatus } from '@/api/types.ts'

const NODE_TYPES: NodeTypes = {
  operationStep: OperationStepNode,
  flowStep: FlowStepNode,
  addStep: AddStepNode,
}

const NODE_SPACING_Y = 100
const NODE_X = 0
const SUB_STEP_INDENT_X = 60

interface FlowCanvasProps {
  steps: FlowStep[]
  operations: Operation[]
  flows: Flow[]
  selectedStepId: string | null
  onSelectStep: (stepId: string | null, flowId?: string) => void
  onAddStep: () => void
  onDrillDown: (flowId: string) => void
  onToggleExpand: (stepId: string) => void
  expandedSubFlowStepIds: Set<string>
  subFlowStepsMap: Map<string, FlowStep[]>
  executionStatuses?: Record<string, ExecutionStatus>
}

export function FlowCanvas({
  steps,
  operations,
  flows,
  selectedStepId,
  onSelectStep,
  onAddStep,
  onDrillDown,
  onToggleExpand,
  expandedSubFlowStepIds,
  subFlowStepsMap,
  executionStatuses = {},
}: FlowCanvasProps) {
  const operationMap = useMemo(() => {
    const map = new Map<string, Operation>()
    operations.forEach((op) => map.set(op.id, op))
    return map
  }, [operations])

  const flowMap = useMemo(() => {
    const map = new Map<string, Flow>()
    flows.forEach((f) => map.set(f.id, f))
    return map
  }, [flows])

  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = []
    // sequence of { id, isSubStep, parentFlowStepId? } used for edge building
    const sequence: { id: string; isSubStep: boolean; parentFlowStepId?: string }[] = []

    let yOffset = 0

    for (const step of steps) {
      const isFlowStep = step.stepKind === 'FLOW_STEP'
      const isExpanded =
        isFlowStep && !!step.nestedFlowId && expandedSubFlowStepIds.has(step.id)

      if (isFlowStep) {
        const nestedFlow = step.nestedFlowId ? flowMap.get(step.nestedFlowId) : null
        nodes.push({
          id: step.id,
          type: 'flowStep',
          position: { x: NODE_X, y: yOffset },
          data: {
            step,
            nestedFlowName: nestedFlow?.name ?? 'Unknown flow',
            selected: step.id === selectedStepId,
            executionStatus: executionStatuses[step.id],
            onDrillDown,
            expanded: isExpanded,
            onToggleExpand: () => onToggleExpand(step.id),
          },
          draggable: false,
        })
      } else {
        const operation = step.operationId ? operationMap.get(step.operationId) : null
        const operationName =
          step.binding === 'LINKED'
            ? (operation?.name ?? 'Unknown operation')
            : step.sourceOperationId
              ? (operationMap.get(step.sourceOperationId)?.name ?? 'Detached') + ' (detached)'
              : 'Detached operation'
        const operationType =
          step.binding === 'LINKED'
            ? (operation?.type ?? 'HTTP_REQUEST')
            : step.ownConfig?.type ?? 'HTTP_REQUEST'

        nodes.push({
          id: step.id,
          type: 'operationStep',
          position: { x: NODE_X, y: yOffset },
          data: {
            step,
            operationName,
            operationType,
            selected: step.id === selectedStepId,
            executionStatus: executionStatuses[step.id],
          },
          draggable: false,
        })
      }

      sequence.push({ id: step.id, isSubStep: false })
      yOffset += NODE_SPACING_Y

      if (isExpanded && step.nestedFlowId) {
        const subSteps = subFlowStepsMap.get(step.nestedFlowId) ?? []
        for (const subStep of subSteps) {
          const subOperation = subStep.operationId ? operationMap.get(subStep.operationId) : null
          const subOperationName =
            subStep.binding === 'LINKED'
              ? (subOperation?.name ?? 'Unknown operation')
              : subStep.sourceOperationId
                ? (operationMap.get(subStep.sourceOperationId)?.name ?? 'Detached') + ' (detached)'
                : 'Detached operation'
          const subOperationType =
            subStep.binding === 'LINKED'
              ? (subOperation?.type ?? 'HTTP_REQUEST')
              : subStep.ownConfig?.type ?? 'HTTP_REQUEST'

          nodes.push({
            id: subStep.id,
            type: 'operationStep',
            position: { x: NODE_X + SUB_STEP_INDENT_X, y: yOffset },
            data: {
              step: subStep,
              operationName: subOperationName,
              operationType: subOperationType,
              selected: subStep.id === selectedStepId,
              executionStatus: executionStatuses[subStep.id],
              isSubFlowChild: true,
              subFlowId: step.nestedFlowId,
            },
            draggable: false,
          })

          sequence.push({ id: subStep.id, isSubStep: true, parentFlowStepId: step.id })
          yOffset += NODE_SPACING_Y
        }
      }
    }

    nodes.push({
      id: '__add__',
      type: 'addStep',
      position: { x: NODE_X, y: yOffset },
      data: { onAdd: onAddStep },
      draggable: false,
      selectable: false,
    })
    sequence.push({ id: '__add__', isSubStep: false })

    // Build edges from sequence
    const edges: Edge[] = []
    for (let i = 0; i < sequence.length - 1; i++) {
      const src = sequence[i]
      const tgt = sequence[i + 1]
      const isSubFlowEdge = src.isSubStep || (!src.isSubStep && tgt.isSubStep)

      edges.push({
        id: `e-${src.id}-${tgt.id}`,
        source: src.id,
        target: tgt.id,
        type: 'smoothstep',
        style: {
          stroke: isSubFlowEdge
            ? 'var(--color-accent-muted)'
            : 'var(--color-border)',
          strokeWidth: isSubFlowEdge ? 1 : 2,
          strokeDasharray: isSubFlowEdge ? '4 3' : undefined,
        },
        animated: executionStatuses[src.id] === 'RUNNING',
      })
    }

    return { initialNodes: nodes, initialEdges: edges }
  }, [
    steps,
    operationMap,
    flowMap,
    selectedStepId,
    executionStatuses,
    onAddStep,
    onDrillDown,
    onToggleExpand,
    expandedSubFlowStepIds,
    subFlowStepsMap,
  ])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id === '__add__') return
      const d = node.data as Record<string, unknown>
      const flowId = d.isSubFlowChild ? (d.subFlowId as string) : undefined
      onSelectStep(node.id === selectedStepId ? null : node.id, flowId)
    },
    [onSelectStep, selectedStepId],
  )

  const handlePaneClick = useCallback(() => {
    onSelectStep(null)
  }, [onSelectStep])

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--color-border-subtle)"
        />
      </ReactFlow>
    </div>
  )
}
