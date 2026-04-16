import { api } from './client.ts'
import type {
  Flow,
  FlowCreateRequest,
  FlowUpdateRequest,
  FlowStep,
  FlowStepCreateRequest,
  FlowStepUpdateRequest,
  ReorderEntry,
  ExtractionRule,
  ExtractionRuleCreateRequest,
  ExtractionRuleUpdateRequest,
  FlowExecutionResult,
  StepResultResponse,
  PageResult,
} from './types.ts'

export const flowsApi = {
  /* ── Flows ──────────────────────────────────────── */
  getAll: () => api.get('flows').json<Flow[]>(),

  getById: (id: string) => api.get(`flows/${id}`).json<Flow>(),

  create: (data: FlowCreateRequest) =>
    api.post('flows', { json: data }).json<Flow>(),

  update: (id: string, data: FlowUpdateRequest) =>
    api.put(`flows/${id}`, { json: data }).json<Flow>(),

  delete: (id: string) => api.delete(`flows/${id}`),

  /* ── Flow Steps ─────────────────────────────────── */
  getSteps: (flowId: string) =>
    api.get(`flows/${flowId}/steps`).json<FlowStep[]>(),

  getStep: (flowId: string, stepId: string) =>
    api.get(`flows/${flowId}/steps/${stepId}`).json<FlowStep>(),

  addStep: (flowId: string, data: FlowStepCreateRequest) =>
    api.post(`flows/${flowId}/steps`, { json: data }).json<FlowStep>(),

  updateStep: (flowId: string, stepId: string, data: FlowStepUpdateRequest) =>
    api.put(`flows/${flowId}/steps/${stepId}`, { json: data }).json<FlowStep>(),

  deleteStep: (flowId: string, stepId: string) =>
    api.delete(`flows/${flowId}/steps/${stepId}`),

  reorderSteps: (flowId: string, entries: ReorderEntry[]) =>
    api.put(`flows/${flowId}/steps/reorder`, { json: entries }),

  /* ── Extraction Rules ───────────────────────────── */
  getRules: (flowId: string, stepId: string) =>
    api.get(`flows/${flowId}/steps/${stepId}/rules`).json<ExtractionRule[]>(),

  addRule: (flowId: string, stepId: string, data: ExtractionRuleCreateRequest) =>
    api.post(`flows/${flowId}/steps/${stepId}/rules`, { json: data }).json<ExtractionRule>(),

  updateRule: (flowId: string, stepId: string, ruleId: string, data: ExtractionRuleUpdateRequest) =>
    api.put(`flows/${flowId}/steps/${stepId}/rules/${ruleId}`, { json: data }).json<ExtractionRule>(),

  deleteRule: (flowId: string, stepId: string, ruleId: string) =>
    api.delete(`flows/${flowId}/steps/${stepId}/rules/${ruleId}`),

  /* ── Flow Execution ─────────────────────────────── */
  execute: (flowId: string, environmentId?: string) =>
    api.post(`flows/${flowId}/execute`, {
      searchParams: environmentId ? { environmentId } : {},
    }).json<FlowExecutionResult>(),

  getExecutions: (flowId: string, page = 0, size = 20) =>
    api.get(`flows/${flowId}/executions`, { searchParams: { page, size } }).json<PageResult<FlowExecutionResult>>(),

  testStep: (flowId: string, stepId: string) =>
    api.post(`flows/${flowId}/steps/${stepId}/test`).json<StepResultResponse>(),
}
