export type AppRole = 'admin' | 'vendor'
export type TaskStatus = 'draft' | 'published' | 'archived'
export type SubmissionStatus = 'pending' | 'approved' | 'revision_required' | 'rejected' | 'withdrawn'

export interface Profile {
  id: string
  role: AppRole
  vendor_id: string | null
  display_name: string
  email: string
  must_change_password: boolean
  disabled_at: string | null
}

export interface Vendor {
  id: string
  name: string
  contact_name: string
  contact_email: string
  status: 'active' | 'disabled'
  created_at: string
}

export interface CandidateTask {
  id: string
  task_code: string
  level1_scene: string
  level2_scene: string
  level2_task: string
  example_name: string
  example_steps: string[]
  target_count: number
  approved_count: number
  pending_count: number
  available_count: number
  status: TaskStatus
  created_at: string
  updated_at: string
}

export interface TaskSubmission {
  id: string
  candidate_task_id: string
  vendor_id: string
  name: string
  status: SubmissionStatus
  review_note: string | null
  submitted_at: string
  updated_at: string
  steps?: SubmissionStep[]
  vendor?: Pick<Vendor, 'id' | 'name'>
  candidate_task?: CandidateTask
}

export interface SubmissionStep {
  id: string
  submission_id: string
  position: number
  instruction: string
}

export interface PaginatedResult<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
}
