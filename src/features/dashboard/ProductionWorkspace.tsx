import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown, ArrowUp, Bell, Check, ChevronRight, ClipboardCheck, FileUp, LayoutGrid, ListTodo,
  LogOut, Plus, Search, ShieldCheck, UserRoundCog, Users, X,
} from 'lucide-react'
import logo from '../../assets/ropedia-logo.png'
import { useAuth } from '../auth/AuthProvider'
import {
  createCandidateTask, deleteCandidateTask, getCandidateTask, getCandidateTaskStats, getTaskFilterOptions, importCandidateTasks,
  listCandidateTasks, listSubmissions, resubmitTaskDesign, reviewSubmission, submitTaskDesign,
  updateCandidateTask,
} from '../../services/tasks'
import type { TaskSortKey } from '../../services/tasks'
import { createVendor, listVendors, setVendorStatus } from '../../services/vendors'
import { candidateTaskCsvTemplate, parseCandidateTaskCsv } from '../../utils/csv'
import type { CandidateTask, SubmissionStatus, TaskSubmission } from '../../types/database'
import { supabase } from '../../lib/supabase'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import '../../App.css'

type View = 'tasks' | 'detail' | 'reviews' | 'vendors' | 'claim' | 'results'

function Status({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'orange' | 'gray' | 'red' }) {
  return <span className={`badge ${tone}`}><i />{children}</span>
}

export default function ProductionWorkspace() {
  const { profile, signOut } = useAuth()
  const [view, setView] = useState<View>(profile?.role === 'admin' ? 'tasks' : 'claim')
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const admin = profile?.role === 'admin'
  const nav = admin
    ? [{ id: 'tasks' as View, label: '候选任务', icon: ListTodo }, { id: 'reviews' as View, label: '任务审核', icon: ClipboardCheck }, { id: 'vendors' as View, label: 'Vendor 管理', icon: UserRoundCog }]
    : [{ id: 'claim' as View, label: '认领任务', icon: LayoutGrid }, { id: 'results' as View, label: '审核结果', icon: ShieldCheck }]

  const openTask = (id: string) => { setSelectedTask(id); setView('detail') }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img src={logo} alt="Ropedia" /></div>
      <nav><p className="nav-label">工作台</p>{nav.map((item) => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}><item.icon size={18} /><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="user-card"><div className="avatar">{profile?.display_name.slice(0, 1)}</div><div><strong>{profile?.display_name}</strong><small>{admin ? '系统管理员' : 'Vendor account'}</small></div><button className="plain-btn" aria-label="退出登录" onClick={signOut}><LogOut size={17} /></button></div></div>
    </aside>
    <main><header><div className="breadcrumb"><span>任务注册中心</span><ChevronRight size={14} /><strong>{nav.find((item) => item.id === view)?.label || '任务详情'}</strong></div><div className="header-actions"><button className="icon-btn"><Search size={18} /></button><button className="icon-btn"><Bell size={18} /></button></div></header>
      <section className="content">
        {view === 'tasks' && <AdminTaskPage openTask={openTask} />}
        {view === 'detail' && selectedTask && <TaskDetailPage id={selectedTask} back={() => setView('tasks')} />}
        {view === 'reviews' && <ReviewPage />}
        {view === 'vendors' && <VendorManagementPage />}
        {view === 'claim' && <ClaimPage />}
        {view === 'results' && <ResultsPage />}
      </section>
    </main>
  </div>
}

function Heading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function AdminTaskPage({ openTask }: { openTask: (id: string) => void }) {
  const client = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const [scene, setScene] = useState('')
  const [taskFilter, setTaskFilter] = useState('')
  const [sortBy, setSortBy] = useState<TaskSortKey>('task_code')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<CandidateTask | null>(null)
  const search = useDebouncedValue(searchInput)
  const options = useQuery({ queryKey: ['task-filter-options'], queryFn: getTaskFilterOptions })
  const tasks = useQuery({ queryKey: ['tasks', search, scene, taskFilter, sortBy, sortDirection, page], queryFn: () => listCandidateTasks({ search, level1Scene: scene || undefined, level2Task: taskFilter || undefined, sortBy, sortDirection, page }) })
  const stats = useQuery({ queryKey: ['task-stats'], queryFn: getCandidateTaskStats })
  const refreshTasks = () => {
    client.invalidateQueries({ queryKey: ['tasks'] })
    client.invalidateQueries({ queryKey: ['task-stats'] })
  }
  const remove = useMutation({ mutationFn: deleteCandidateTask, onSuccess: refreshTasks })
  const csvImport = useMutation({ mutationFn: async (file: File) => {
    const result = await parseCandidateTaskCsv(file)
    if (result.errors.length) throw new Error(result.errors.map((item) => `第 ${item.row} 行：${item.message}`).join('\n'))
    return importCandidateTasks(result.tasks, file)
  }, onSuccess: refreshTasks })

  return <><Heading eyebrow="ADMIN / CANDIDATE TASKS" title="候选任务列表" description="管理真实数据采集任务池" action={<div className="action-row"><button className="secondary" onClick={downloadCsvTemplate}>下载模板</button><label className="secondary file-button"><FileUp size={16} />导入 CSV<input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && csvImport.mutate(e.target.files[0])} /></label><button className="primary" onClick={() => setShowCreate(true)}><Plus size={16} />新建任务</button></div>} />
    <div className="stats-grid"><div className="stat-card accent"><span>任务目标总数</span><strong>{stats.data?.target_count ?? 0}</strong><ListTodo /></div><div className="stat-card"><span>已审核通过</span><strong>{stats.data?.approved_count ?? 0}</strong><Check /></div><div className="stat-card"><span>待审核</span><strong>{stats.data?.pending_count ?? 0}</strong><ClipboardCheck /></div><div className="stat-card"><span>候选任务条目</span><strong>{stats.data?.task_count ?? 0}</strong><LayoutGrid /></div></div>
    <div className="panel"><div className="filter-bar"><div className="search-box"><Search size={17} /><input value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1) }} placeholder="模糊搜索三级任务名称或编号..." /></div><select value={scene} onChange={(e) => { setScene(e.target.value); setPage(1) }}><option value="">全部场景</option>{options.data?.scenes.map((item) => <option key={item}>{item}</option>)}</select><select value={taskFilter} onChange={(e) => { setTaskFilter(e.target.value); setPage(1) }}><option value="">全部任务</option>{options.data?.tasks.map((item) => <option key={item}>{item}</option>)}</select></div>
      {tasks.isError && <ErrorBox error={tasks.error} />}{csvImport.isError && <ErrorBox error={csvImport.error} />}
      <div className="table-wrap"><table><thead><tr><SortableHeader label="编号" sortKey="task_code" active={sortBy} direction={sortDirection} onSort={(key, direction) => { setSortBy(key); setSortDirection(direction); setPage(1) }} /><SortableHeader label="场景" sortKey="scene" active={sortBy} direction={sortDirection} onSort={(key, direction) => { setSortBy(key); setSortDirection(direction); setPage(1) }} /><th>二级任务</th><th>三级任务示例</th><SortableHeader label="总数" sortKey="target_count" active={sortBy} direction={sortDirection} onSort={(key, direction) => { setSortBy(key); setSortDirection(direction); setPage(1) }} /><SortableHeader label="已通过" sortKey="approved_count" active={sortBy} direction={sortDirection} onSort={(key, direction) => { setSortBy(key); setSortDirection(direction); setPage(1) }} /><SortableHeader label="待审核" sortKey="pending_count" active={sortBy} direction={sortDirection} onSort={(key, direction) => { setSortBy(key); setSortDirection(direction); setPage(1) }} /><SortableHeader label="剩余" sortKey="available_count" active={sortBy} direction={sortDirection} onSort={(key, direction) => { setSortBy(key); setSortDirection(direction); setPage(1) }} /><th /></tr></thead><tbody>{tasks.data?.data.map((task) => <tr key={task.id}><td><button className="task-link" onClick={() => openTask(task.id)}>{task.task_code}</button></td><td><strong>{task.level1_scene}</strong><small>{task.level2_scene}</small></td><td>{task.level2_task}</td><td><button className="name-link" onClick={() => openTask(task.id)}><strong>{task.example_name}</strong><small>{task.example_steps.join(' → ')}</small></button></td><td>{task.target_count}</td><td><span className="count-cell approved">{task.approved_count}</span></td><td><span className="count-cell pending">{task.pending_count}</span></td><td>{task.available_count}</td><td><div className="action-row"><button className="secondary" onClick={() => setEditing(task)}>编辑</button><button className="danger" onClick={() => confirm('确认删除该任务？') && remove.mutate(task.id)}>删除</button></div></td></tr>)}</tbody></table></div>
      <Pager page={page} pageSize={25} count={tasks.data?.count ?? 0} setPage={setPage} />
    </div>{showCreate && <TaskDialog close={() => setShowCreate(false)} />}{editing && <TaskDialog initial={editing} close={() => setEditing(null)} />}</>
}

function TaskDialog({ close, initial }: { close: () => void; initial?: CandidateTask }) {
  const client = useQueryClient()
  const [form, setForm] = useState({ level1_scene: initial?.level1_scene ?? '', level2_scene: initial?.level2_scene ?? '', level2_task: initial?.level2_task ?? '', example_name: initial?.example_name ?? '', example_steps: initial?.example_steps.join('\n') ?? '', target_count: initial?.target_count ?? 1, status: initial?.status ?? 'published' })
  const input = () => ({ ...form, example_steps: form.example_steps.split('\n').filter(Boolean) })
  const mutation = useMutation({ mutationFn: () => initial ? updateCandidateTask(initial.id, input()) : createCandidateTask(input()), onSuccess: () => { client.invalidateQueries({ queryKey: ['tasks'] }); client.invalidateQueries({ queryKey: ['task-stats'] }); close() } })
  return <div className="modal-backdrop"><form className="modal wide" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}><button type="button" className="modal-close" onClick={close}><X /></button><div className="modal-heading"><span><Plus /></span><div><h2>{initial ? '编辑候选任务' : '新建候选任务'}</h2><p>任务发布后 Vendor 即可认领</p></div></div><div className="form-grid">{(['level1_scene', 'level2_scene', 'level2_task', 'example_name'] as const).map((key) => <label key={key}>{({ level1_scene: '一级场景', level2_scene: '二级场景', level2_task: '二级任务', example_name: '三级任务示例名称' })[key]}<input required value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}<label className="full">示例步骤（每行一步）<textarea required value={form.example_steps} onChange={(e) => setForm({ ...form, example_steps: e.target.value })} /></label><label>任务总数<input type="number" min={initial ? initial.approved_count + initial.pending_count : 1} value={form.target_count} onChange={(e) => setForm({ ...form, target_count: Number(e.target.value) })} /></label><label>上传状态<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CandidateTask['status'] })}><option value="published">已发布</option><option value="draft">草稿</option><option value="archived">已归档</option></select></label></div>{mutation.isError && <ErrorBox error={mutation.error} />}<div className="modal-actions"><button type="button" className="secondary" onClick={close}>取消</button><button className="primary" disabled={mutation.isPending}>{initial ? '保存修改' : '创建并发布'}</button></div></form></div>
}

function TaskDetailPage({ id, back }: { id: string; back: () => void }) {
  const detail = useQuery({ queryKey: ['task', id], queryFn: () => getCandidateTask(id) })
  if (detail.isLoading) return <Loading />
  if (detail.isError || !detail.data) return <ErrorBox error={detail.error} />
  const { task, submissions } = detail.data
  return <><button className="back-button" onClick={back}>返回候选任务</button><Heading eyebrow={task.task_code} title={task.example_name} description={`${task.level1_scene} / ${task.level2_scene} / ${task.level2_task}`} /><div className="detail-metrics"><div><span>总数</span><strong>{task.target_count}</strong></div><div><span>已通过</span><strong>{task.approved_count}</strong></div><div><span>待审核</span><strong>{task.pending_count}</strong></div><div><span>剩余</span><strong>{task.available_count}</strong></div></div><SubmissionList title="待审核任务" items={submissions.filter((item) => item.status === 'pending')} /><SubmissionList title="已通过任务" items={submissions.filter((item) => item.status === 'approved')} /></>
}

function SubmissionList({ title, items }: { title: string; items: TaskSubmission[] }) {
  return <section className="detail-section panel"><div className="detail-section-title"><h3>{title}</h3><Status tone={title.includes('待') ? 'orange' : 'green'}>{items.length} 项</Status></div><div className="approved-designs detail-approved">{items.map((item) => <article key={item.id}><div><span>{item.id.slice(0, 8)}</span><Status tone={item.status === 'approved' ? 'green' : 'orange'}>{item.status === 'approved' ? '已通过' : '待审核'}</Status></div><h4>{item.name}</h4><p>Vendor：{item.vendor?.name}</p><ol>{item.steps?.sort((a, b) => a.position - b.position).map((step) => <li key={step.id}><i>{String(step.position).padStart(2, '0')}</i>{step.instruction}</li>)}</ol></article>)}</div></section>
}

function ReviewPage() {
  const client = useQueryClient()
  const [scene, setScene] = useState('')
  const [task, setTask] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [reviewStatus, setReviewStatus] = useState<'all' | SubmissionStatus>('pending')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)
  const options = useQuery({ queryKey: ['task-filter-options'], queryFn: getTaskFilterOptions })
  const query = useQuery({ queryKey: ['submissions', reviewStatus, scene, task, vendorId, page], queryFn: () => listSubmissions({ status: reviewStatus === 'all' ? undefined : reviewStatus, scene: scene || undefined, task: task || undefined, vendorId: vendorId || undefined, page }) })
  const vendors = useQuery({ queryKey: ['vendors'], queryFn: listVendors })
  const current = query.data?.data.find((item) => item.id === selected) ?? query.data?.data[0]
  const approved = useQuery({ queryKey: ['task', current?.candidate_task_id], queryFn: () => getCandidateTask(current!.candidate_task_id), enabled: Boolean(current) })
  const review = useMutation({ mutationFn: ({ decision, note }: { decision: 'approved' | 'revision_required'; note?: string }) => reviewSubmission(current!.id, decision, note), onSuccess: () => { client.invalidateQueries({ queryKey: ['submissions'] }); client.invalidateQueries({ queryKey: ['tasks'] }); client.invalidateQueries({ queryKey: ['task-stats'] }) } })
  const statusOptions: { value: 'all' | SubmissionStatus; label: string }[] = [{ value: 'all', label: '全部' }, { value: 'pending', label: '待审核' }, { value: 'approved', label: '已通过' }, { value: 'revision_required', label: '需修改' }, { value: 'rejected', label: '已拒绝' }, { value: 'withdrawn', label: '已撤回' }]
  const statusLabel = statusOptions.find((item) => item.value === current?.status)?.label ?? ''
  return <><Heading eyebrow="ADMIN / REVIEW" title="任务审核" description="查看不同审核状态，并按场景、任务和 Vendor 筛选" /><div className="result-tabs review-status-tabs">{statusOptions.map((item) => <button key={item.value} className={reviewStatus === item.value ? 'active' : ''} onClick={() => { setReviewStatus(item.value); setSelected(null); setPage(1) }}>{item.label}</button>)}</div><div className="review-filters"><select value={scene} onChange={(e) => { setScene(e.target.value); setPage(1) }}><option value="">全部场景</option>{options.data?.scenes.map((item) => <option key={item}>{item}</option>)}</select><select value={task} onChange={(e) => { setTask(e.target.value); setPage(1) }}><option value="">全部任务</option>{options.data?.tasks.map((item) => <option key={item}>{item}</option>)}</select><select value={vendorId} onChange={(e) => { setVendorId(e.target.value); setPage(1) }}><option value="">全部 Vendor</option>{vendors.data?.map((item: { id: string; name: string }) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>{query.isError && <ErrorBox error={query.error} />}<div className="review-layout"><div className="panel review-list">{query.data?.data.map((item) => <button key={item.id} className={`review-item ${item.id === current?.id ? 'selected' : ''}`} onClick={() => setSelected(item.id)}><strong>{item.name}</strong><p>{item.vendor?.name} · {item.candidate_task?.example_name}</p><Status tone={item.status === 'approved' ? 'green' : item.status === 'pending' ? 'orange' : item.status === 'rejected' ? 'red' : 'gray'}>{statusOptions.find((status) => status.value === item.status)?.label}</Status></button>)}<Pager page={page} pageSize={25} count={query.data?.count ?? 0} setPage={(next) => { setPage(next); setSelected(null) }} /></div>{current && <div className="review-preview"><div className="preview-hero"><span>{statusLabel}</span><h2>{current.name}</h2><p>{current.vendor?.name}</p></div><div className="preview-body"><section><label>任务步骤</label><ol>{current.steps?.sort((a, b) => a.position - b.position).map((step) => <li key={step.id}><i>{String(step.position).padStart(2, '0')}</i>{step.instruction}</li>)}</ol></section><section><label>已通过的同级任务完整清单</label><SubmissionList title="已通过" items={approved.data?.submissions.filter((item) => item.status === 'approved') ?? []} /></section>{review.isError && <ErrorBox error={review.error} />}{current.status === 'pending' && <div className="review-actions"><button className="danger" onClick={() => { const note = prompt('请输入至少 5 个字的退回原因'); if (note && note.trim().length >= 5) review.mutate({ decision: 'revision_required', note }) }}>退回修改</button><button className="primary" onClick={() => review.mutate({ decision: 'approved' })}><Check size={16} />通过审核</button></div>}</div></div>}</div></>
}

function VendorManagementPage() {
  const client = useQueryClient()
  const vendors = useQuery({ queryKey: ['vendors'], queryFn: listVendors })
  const [show, setShow] = useState(false)
  const status = useMutation({ mutationFn: ({ id, next }: { id: string; next: 'active' | 'disabled' }) => setVendorStatus(id, next), onSuccess: () => client.invalidateQueries({ queryKey: ['vendors'] }) })
  return <><Heading eyebrow="ADMIN / ACCOUNTS" title="Vendor 账号" description="创建、启停和查看供应商交付情况" action={<button className="primary" onClick={() => setShow(true)}><Plus size={16} />创建 Vendor</button>} /><div className="panel table-wrap"><table><thead><tr><th>公司</th><th>联系人</th><th>邮箱</th><th>已认领</th><th>已通过</th><th>状态</th><th /></tr></thead><tbody>{vendors.data?.map((vendor: { id: string; name: string; contact_name: string; contact_email: string; claimed_count: number; approved_count: number; status: 'active' | 'disabled' }) => <tr key={vendor.id}><td><strong>{vendor.name}</strong></td><td>{vendor.contact_name}</td><td>{vendor.contact_email}</td><td>{vendor.claimed_count}</td><td>{vendor.approved_count}</td><td><Status tone={vendor.status === 'active' ? 'green' : 'red'}>{vendor.status === 'active' ? '正常' : '已停用'}</Status></td><td><button className="secondary" onClick={() => status.mutate({ id: vendor.id, next: vendor.status === 'active' ? 'disabled' : 'active' })}>{vendor.status === 'active' ? '停用' : '启用'}</button></td></tr>)}</tbody></table></div>{show && <CreateVendorDialog close={() => setShow(false)} />}</>
}

function CreateVendorDialog({ close }: { close: () => void }) {
  const client = useQueryClient()
  const [form, setForm] = useState({ companyName: '', contactName: '', email: '', temporaryPassword: '' })
  const mutation = useMutation({ mutationFn: () => createVendor(form), onSuccess: () => { client.invalidateQueries({ queryKey: ['vendors'] }); close() } })
  return <div className="modal-backdrop"><form className="modal" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}><button type="button" className="modal-close" onClick={close}><X /></button><div className="modal-heading"><span><Users /></span><div><h2>创建 Vendor 账号</h2><p>用户首次登录后必须修改临时密码</p></div></div><div className="form-grid">{Object.entries({ companyName: '公司名称', contactName: '联系人', email: '登录邮箱', temporaryPassword: '临时密码' }).map(([key, label]) => <label className="full" key={key}>{label}<input required type={key.includes('Password') ? 'password' : key === 'email' ? 'email' : 'text'} value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}</div>{mutation.isError && <ErrorBox error={mutation.error} />}<div className="modal-actions"><button type="button" className="secondary" onClick={close}>取消</button><button className="primary">创建账号</button></div></form></div>
}

function ClaimPage() {
  const [searchInput, setSearchInput] = useState('')
  const [scene, setScene] = useState('')
  const [taskFilter, setTaskFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<CandidateTask | null>(null)
  const search = useDebouncedValue(searchInput)
  const options = useQuery({ queryKey: ['task-filter-options'], queryFn: getTaskFilterOptions })
  const tasks = useQuery({ queryKey: ['available-tasks', search, scene, taskFilter, page], queryFn: () => listCandidateTasks({ search, level1Scene: scene || undefined, level2Task: taskFilter || undefined, status: 'published', availableOnly: true, page, pageSize: 50 }) })
  return <><Heading eyebrow="VENDOR / AVAILABLE" title="认领任务" description="从任务库中检索并提交你的三级任务设计" /><div className="panel"><div className="filter-bar"><div className="search-box"><Search size={17} /><input value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1) }} placeholder="模糊搜索三级任务名称或编号..." /></div><select value={scene} onChange={(e) => { setScene(e.target.value); setPage(1) }}><option value="">全部场景</option>{options.data?.scenes.map((item) => <option key={item}>{item}</option>)}</select><select value={taskFilter} onChange={(e) => { setTaskFilter(e.target.value); setPage(1) }}><option value="">全部任务</option>{options.data?.tasks.map((item) => <option key={item}>{item}</option>)}</select></div><div className="table-wrap"><table><thead><tr><th>编号</th><th>场景</th><th>二级任务</th><th>三级任务示例</th><th>可认领</th><th /></tr></thead><tbody>{tasks.data?.data.map((task) => <tr key={task.id}><td>{task.task_code}</td><td><strong>{task.level1_scene}</strong><small>{task.level2_scene}</small></td><td>{task.level2_task}</td><td><strong>{task.example_name}</strong><small>{task.example_steps.join(' → ')}</small></td><td><Status>{task.available_count}</Status></td><td><button className="claim-button" onClick={() => setSelected(task)}>认领并设计<ChevronRight size={15} /></button></td></tr>)}</tbody></table></div><Pager page={page} pageSize={50} count={tasks.data?.count ?? 0} setPage={setPage} /></div>{selected && <SubmitDesignDialog task={selected} close={() => setSelected(null)} />}</>
}

function SubmitDesignDialog({ task, close }: { task: CandidateTask; close: () => void }) {
  const client = useQueryClient()
  const [name, setName] = useState('')
  const [steps, setSteps] = useState('')
  const mutation = useMutation({ mutationFn: () => submitTaskDesign(task.id, name, steps.split('\n').filter(Boolean)), onSuccess: () => { client.invalidateQueries({ queryKey: ['available-tasks'] }); close() } })
  return <div className="modal-backdrop"><form className="modal wide" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}><button type="button" className="modal-close" onClick={close}><X /></button><div className="modal-heading"><span><ClipboardCheck /></span><div><h2>认领并提交设计</h2><p>{task.example_name}</p></div></div><div className="form-grid"><label className="full">三级任务名称<input required value={name} onChange={(e) => setName(e.target.value)} /></label><label className="full">任务步骤（每行一步）<textarea required value={steps} onChange={(e) => setSteps(e.target.value)} /></label></div>{mutation.isError && <ErrorBox error={mutation.error} />}<div className="modal-actions"><button type="button" className="secondary" onClick={close}>取消</button><button className="primary">提交审核</button></div></form></div>
}

function ResultsPage() {
  const [editing, setEditing] = useState<TaskSubmission | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebouncedValue(searchInput)
  const client = useQueryClient()
  const submissions = useQuery({ queryKey: ['my-submissions', search, page], queryFn: () => listSubmissions({ search, page, pageSize: 20 }) })
  useEffect(() => {
    const channel = supabase.channel('my-submission-results')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'task_submissions' }, () => {
        client.invalidateQueries({ queryKey: ['my-submissions'] })
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [client])
  return <><Heading eyebrow="VENDOR / RESULTS" title="审核结果" description="查看完整任务信息、审核状态与反馈" /><div className="panel"><div className="filter-bar"><div className="search-box"><Search size={17} /><input value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1) }} placeholder="搜索设计的三级任务名称..." /></div></div>{submissions.isError && <ErrorBox error={submissions.error} />}<div className="table-wrap result-task-table"><table><thead><tr><th>三级任务名称</th><th>任务步骤</th><th>一级场景</th><th>二级场景</th><th>二级任务</th><th>审核结果</th><th>审核意见</th><th /></tr></thead><tbody>{submissions.data?.data.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{new Date(item.submitted_at).toLocaleString('zh-CN')}</small></td><td><div className="result-steps">{item.steps?.sort((a, b) => a.position - b.position).map((step, index) => <span key={step.id}><i>{index + 1}</i>{step.instruction}</span>)}</div></td><td>{item.candidate_task?.level1_scene}</td><td>{item.candidate_task?.level2_scene}</td><td>{item.candidate_task?.level2_task}</td><td><Status tone={item.status === 'approved' ? 'green' : item.status === 'revision_required' ? 'orange' : item.status === 'rejected' ? 'red' : 'gray'}>{{ approved: '已通过', revision_required: '需修改', rejected: '已拒绝', pending: '审核中', withdrawn: '已撤回' }[item.status]}</Status></td><td><span className="review-note">{item.review_note || '暂无审核意见'}</span></td><td>{item.status === 'revision_required' && <button className="secondary" onClick={() => setEditing(item)}>修改</button>}</td></tr>)}</tbody></table></div><Pager page={page} pageSize={20} count={submissions.data?.count ?? 0} setPage={setPage} /></div>{editing && <EditSubmissionDialog submission={editing} close={() => setEditing(null)} />}</>
}

function EditSubmissionDialog({ submission, close }: { submission: TaskSubmission; close: () => void }) {
  const client = useQueryClient()
  const [name, setName] = useState(submission.name)
  const [steps, setSteps] = useState(submission.steps?.sort((a, b) => a.position - b.position).map((step) => step.instruction).join('\n') || '')
  const mutation = useMutation({ mutationFn: () => resubmitTaskDesign(submission.id, name, steps.split('\n').filter(Boolean)), onSuccess: () => { client.invalidateQueries({ queryKey: ['my-submissions'] }); close() } })
  return <div className="modal-backdrop"><form className="modal wide" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}><button type="button" className="modal-close" onClick={close}><X /></button><div className="modal-heading"><span><ClipboardCheck /></span><div><h2>修改任务设计</h2><p>{submission.review_note}</p></div></div><div className="form-grid"><label className="full">三级任务名称<input required value={name} onChange={(e) => setName(e.target.value)} /></label><label className="full">任务步骤（每行一步）<textarea required value={steps} onChange={(e) => setSteps(e.target.value)} /></label></div>{mutation.isError && <ErrorBox error={mutation.error} />}<div className="modal-actions"><button type="button" className="secondary" onClick={close}>取消</button><button className="primary">重新提交审核</button></div></form></div>
}

function ErrorBox({ error }: { error: unknown }) {
  return <div className="auth-error">{error instanceof Error ? error.message : '请求失败，请稍后重试'}</div>
}

function Loading() {
  return <div className="panel empty-state">正在加载…</div>
}

function SortableHeader({ label, sortKey, active, direction, onSort }: { label: string; sortKey: TaskSortKey; active: TaskSortKey; direction: 'asc' | 'desc'; onSort: (key: TaskSortKey, direction: 'asc' | 'desc') => void }) {
  const nextDirection = active === sortKey && direction === 'asc' ? 'desc' : 'asc'
  return <th><button className={`sort-button ${active === sortKey ? 'active' : ''}`} onClick={() => onSort(sortKey, nextDirection)}>{label}{active === sortKey ? direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : <span className="sort-placeholder" />}</button></th>
}

function Pager({ page, pageSize, count, setPage }: { page: number; pageSize: number; count: number; setPage: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  return <div className="pagination"><span>第 {page} / {totalPages} 页，共 {count} 条</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button><PageJump key={page} page={page} totalPages={totalPages} setPage={setPage} /><button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</button></div></div>
}

function PageJump({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (page: number) => void }) {
  const [input, setInput] = useState(String(page))
  const jump = () => {
    const next = Math.min(totalPages, Math.max(1, Number.parseInt(input, 10) || page))
    setInput(String(next))
    setPage(next)
  }
  return <label className="page-jump">跳至<input inputMode="numeric" value={input} onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))} onBlur={jump} onKeyDown={(e) => e.key === 'Enter' && jump()} />页</label>
}

function downloadCsvTemplate() {
  const url = URL.createObjectURL(new Blob([`\uFEFF${candidateTaskCsvTemplate}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'candidate-tasks-template.csv'
  link.click()
  URL.revokeObjectURL(url)
}
