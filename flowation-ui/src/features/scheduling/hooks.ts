import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schedulesApi } from './api.ts'
import type { Schedule, ScheduleCreateRequest, ScheduleUpdateRequest } from '@/api/types.ts'

export const scheduleKeys = {
  all: () => ['schedules'] as const,
  detail: (id: string) => ['schedules', id] as const,
}

export function useSchedules() {
  return useQuery({
    queryKey: scheduleKeys.all(),
    queryFn: schedulesApi.getAll,
  })
}

export function useCreateSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ScheduleCreateRequest) => schedulesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all() }),
  })
}

export function useUpdateSchedule(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ScheduleUpdateRequest) => schedulesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all() }),
  })
}

export function useDeleteSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => schedulesApi.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: scheduleKeys.all() })
      const previous = qc.getQueryData<Schedule[]>(scheduleKeys.all())
      qc.setQueryData<Schedule[]>(scheduleKeys.all(), (old) => old?.filter((s) => s.id !== id) ?? [])
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous !== undefined) qc.setQueryData(scheduleKeys.all(), ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: scheduleKeys.all() }),
  })
}

export function usePauseSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => schedulesApi.pause(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all() }),
  })
}

export function useResumeSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => schedulesApi.resume(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all() }),
  })
}
