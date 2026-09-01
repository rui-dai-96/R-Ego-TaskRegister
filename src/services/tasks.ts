import { supabase } from '../lib/supabase'
import type { CandidateTask, PaginatedResult, SubmissionStatus, TaskSubmission } from '../types/database'

type RawCandidateTask = Omit<CandidateTask, 'level1_scene' | 'level2_scene' | 'level2_task' | 'example_steps'> & {
  level_one_scene: string
  level_two_scene: string
  level_two_task: string
  example_steps: string
}

function mapCandidateTask(row: RawCandidateTask): CandidateTask {
  return {
    ...row,
    level1_scene: row.level_one_scene,
    level2_scene: row.level_two_scene,
    level2_task: row.level_two_task,
    example_steps: row.example_steps.split(/\s*→\s*/).filter(Boolean),
  }
}

function mapSubmission(row: Record<string, unknown>): TaskSubmission {
  const reviews = (row.review_records as { feedback?: string; created_at?: string }[] | undefined) ?? []
  const latestReview = [...reviews].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]
  return {
    id: String(row.id),
    candidate_task_id: String(row.candidate_task_id),
    vendor_id: String(row.vendor_id),
    name: String(row.design_name),
    status: row.status as SubmissionStatus,
    review_note: latestReview?.feedback ?? null,
    submitted_at: String(row.submitted_at),
    updated_at: String(row.updated_at),
    steps: row.steps as TaskSubmission['steps'],
    vendor: row.vendor as TaskSubmission['vendor'],
    candidate_task: row.candidate_task ? mapCandidateTask(row.candidate_task as RawCandidateTask) : undefined,
  }
}

export type TaskFilters = {
  search?: string
  level1Scene?: string
  level2Task?: string
  status?: string
  availableOnly?: boolean
  sortBy?: TaskSortKey
  sortDirection?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export type TaskSortKey = 'task_code' | 'scene' | 'target_count' | 'approved_count' | 'pending_count' | 'available_count'

export async function listCandidateTasks(filters: TaskFilters = {}): Promise<PaginatedResult<CandidateTask>> {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 25
  const from = (page - 1) * pageSize
  let query = supabase.from('candidate_tasks').select('*', { count: 'exact' })

  const search = filters.search?.trim()
  if (search) {
    const value = search.replace(/[,%_().]/g, ' ')
    query = query.or(`task_code.ilike.%${value}%,example_name.ilike.%${value}%,level_two_task.ilike.%${value}%`)
  }
  if (filters.level1Scene) query = query.eq('level_one_scene', filters.level1Scene)
  if (filters.level2Task) query = query.eq('level_two_task', filters.level2Task)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.availableOnly) query = query.gt('available_count', 0)

  const sortColumns: Record<TaskSortKey, string> = {
    task_code: 'task_code',
    scene: 'level_one_scene',
    target_count: 'target_count',
    approved_count: 'approved_count',
    pending_count: 'pending_count',
    available_count: 'available_count',
  }
  const sortBy = filters.sortBy ?? 'task_code'
  const ascending = (filters.sortDirection ?? 'desc') === 'asc'
  query = query.order(sortColumns[sortBy], { ascending })
  if (sortBy === 'scene') query = query.order('level_two_scene', { ascending })
  const { data, count, error } = await query.order('id', { ascending: true }).range(from, from + pageSize - 1)
  if (error) throw error
  return { data: (data ?? []).map((row) => mapCandidateTask(row as RawCandidateTask)), count: count ?? 0, page, pageSize }
}

export async function getTaskFilterOptions() {
  const { data, error } = await supabase.rpc('get_task_filter_options')
  if (error) throw error
  const result = data as { scenes?: string[]; tasks?: string[] } | null
  return { scenes: result?.scenes ?? [], tasks: result?.tasks ?? [] }
}

export async function getCandidateTaskStats() {
  const { data, error } = await supabase.rpc('get_candidate_task_stats')
  if (error) throw error
  return (data?.[0] ?? { task_count: 0, target_count: 0, approved_count: 0, pending_count: 0, available_count: 0 }) as {
    task_count: number
    target_count: number
    approved_count: number
    pending_count: number
    available_count: number
  }
}

export async function getCandidateTask(id: string) {
  const [{ data: task, error: taskError }, { data: submissions, error: submissionError }] = await Promise.all([
    supabase.from('candidate_tasks').select('*').eq('id', id).single(),
    supabase.from('task_submissions').select('*, vendor:vendors(id,company_name), steps:submission_steps(*), review_records(feedback,created_at)').eq('candidate_task_id', id).order('submitted_at', { ascending: false }),
  ])
  if (taskError) throw taskError
  if (submissionError) throw submissionError
  return {
    task: mapCandidateTask(task as RawCandidateTask),
    submissions: (submissions ?? []).map((row) => mapSubmission({
      ...row,
      vendor: row.vendor ? { id: row.vendor.id, name: row.vendor.company_name } : undefined,
    })),
  }
}

export type CandidateTaskInput = Pick<CandidateTask, 'level1_scene' | 'level2_scene' | 'level2_task' | 'example_name' | 'example_steps' | 'target_count' | 'status'>

export async function createCandidateTask(input: CandidateTaskInput) {
  const { data, error } = await supabase.from('candidate_tasks').insert({
    level_one_scene: input.level1_scene,
    level_two_scene: input.level2_scene,
    level_two_task: input.level2_task,
    example_name: input.example_name,
    example_steps: input.example_steps.join(' → '),
    target_count: input.target_count,
    status: input.status,
  }).select().single()
  if (error) throw error
  return mapCandidateTask(data as RawCandidateTask)
}

export async function importCandidateTasks(tasks: CandidateTaskInput[], file: File) {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('登录会话已失效')
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${auth.user.id}/${Date.now()}-${safeName}`
  const { error: uploadError } = await supabase.storage.from('csv-imports').upload(storagePath, file, {
    contentType: file.type || 'text/csv',
    upsert: false,
  })
  if (uploadError) throw uploadError

  const { data, error } = await supabase.rpc('import_candidate_tasks', {
    p_tasks: tasks,
    p_file_name: file.name,
    p_storage_path: storagePath,
  })
  if (error) {
    await supabase.storage.from('csv-imports').remove([storagePath])
    throw error
  }
  return data
}

export async function updateCandidateTask(id: string, input: Partial<CandidateTaskInput>) {
  const patch = {
    ...(input.level1_scene !== undefined && { level_one_scene: input.level1_scene }),
    ...(input.level2_scene !== undefined && { level_two_scene: input.level2_scene }),
    ...(input.level2_task !== undefined && { level_two_task: input.level2_task }),
    ...(input.example_name !== undefined && { example_name: input.example_name }),
    ...(input.example_steps !== undefined && { example_steps: input.example_steps.join(' → ') }),
    ...(input.target_count !== undefined && { target_count: input.target_count }),
    ...(input.status !== undefined && { status: input.status }),
  }
  const { data, error } = await supabase.from('candidate_tasks').update(patch).eq('id', id).select().single()
  if (error) throw error
  return mapCandidateTask(data as RawCandidateTask)
}

export async function deleteCandidateTask(id: string) {
  const { error } = await supabase.from('candidate_tasks').delete().eq('id', id)
  if (error) throw error
}

export async function submitTaskDesign(candidateTaskId: string, name: string, steps: string[]) {
  const { data, error } = await supabase.rpc('claim_and_submit_task', {
    p_candidate_task_id: candidateTaskId,
    p_design_name: name,
    p_steps: steps,
  })
  if (error) throw error
  return data as string
}

export async function resubmitTaskDesign(submissionId: string, name: string, steps: string[]) {
  const { data, error } = await supabase.rpc('resubmit_task_design', {
    p_submission_id: submissionId,
    p_design_name: name,
    p_steps: steps,
  })
  if (error) throw error
  return data as string
}

export type SubmissionFilters = {
  search?: string
  scene?: string
  task?: string
  vendorId?: string
  status?: SubmissionStatus
  page?: number
  pageSize?: number
}

export async function listSubmissions(filters: SubmissionFilters = {}): Promise<PaginatedResult<TaskSubmission>> {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 25
  const from = (page - 1) * pageSize
  let query = supabase
    .from('task_submissions')
    .select('*, vendor:vendors(id,company_name), candidate_task:candidate_tasks!inner(*), steps:submission_steps(*), review_records(feedback,created_at)', { count: 'exact' })
  if (filters.search?.trim()) {
    query = query.ilike('design_name', `%${filters.search.trim().replace(/[%_]/g, ' ')}%`)
  }
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.vendorId) query = query.eq('vendor_id', filters.vendorId)
  if (filters.scene) query = query.eq('candidate_task.level_one_scene', filters.scene)
  if (filters.task) query = query.eq('candidate_task.level_two_task', filters.task)
  const { data, count, error } = await query.order('submitted_at', { ascending: false }).range(from, from + pageSize - 1)
  if (error) throw error
  return {
    data: (data ?? []).map((row) => mapSubmission({
      ...row,
      vendor: row.vendor ? { id: row.vendor.id, name: row.vendor.company_name } : undefined,
    })),
    count: count ?? 0,
    page,
    pageSize,
  }
}

export async function reviewSubmission(submissionId: string, decision: 'approved' | 'revision_required', note?: string) {
  const { data, error } = await supabase.rpc('review_submission', {
    p_submission_id: submissionId,
    p_decision: decision,
    p_feedback: note || null,
  })
  if (error) throw error
  return data
}
