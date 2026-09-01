import { useMemo, useState } from 'react'
import {
  Bell, Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck,
  ClipboardCheck, FileUp, LayoutGrid, ListTodo, MoreHorizontal, Pencil,
  Plus, Search, ShieldCheck, Trash2, Upload, UserRoundCog, Users, X,
} from 'lucide-react'
import logo from '../../assets/ropedia-logo.png'
import '../../App.css'

type Role = 'admin' | 'vendor'
type Page = 'tasks' | 'taskDetail' | 'reviews' | 'vendors' | 'claim' | 'results'
type TaskStatus = '已发布' | '草稿'

type Task = {
  id: string
  level1: string
  level2: string
  level2Task: string
  example: string
  steps: string
  quantity: number
  total: number
  approved: number
  pending: number
  status: TaskStatus
}

const seedTasks: Task[] = [
  { id: 'TSK-0248', level1: '家庭场景', level2: '厨房', level2Task: '餐具整理', example: '将餐后餐具放入洗碗机', steps: '识别餐具 → 分类收集 → 打开洗碗机 → 依次放入', quantity: 24, total: 40, approved: 13, pending: 3, status: '已发布' },
  { id: 'TSK-0247', level1: '家庭场景', level2: '客厅', level2Task: '物品归位', example: '整理散落在沙发上的靠枕', steps: '识别靠枕 → 抓取 → 调整朝向 → 整齐摆放', quantity: 16, total: 30, approved: 12, pending: 2, status: '已发布' },
  { id: 'TSK-0246', level1: '商业场景', level2: '便利店', level2Task: '货架补货', example: '为饮料冷柜补充瓶装水', steps: '扫描缺货位 → 搬运货箱 → 拆箱 → 按标签补货', quantity: 32, total: 50, approved: 13, pending: 5, status: '已发布' },
  { id: 'TSK-0245', level1: '工业场景', level2: '仓库', level2Task: '包裹分拣', example: '按区域码分拣小型包裹', steps: '读取面单 → 匹配区域 → 抓取包裹 → 放入对应料框', quantity: 0, total: 25, approved: 25, pending: 0, status: '已发布' },
  { id: 'TSK-0244', level1: '家庭场景', level2: '卧室', level2Task: '床铺整理', example: '铺平床单并摆放枕头', steps: '拉平床单 → 整理四角 → 拍松枕头 → 靠床头摆放', quantity: 12, total: 20, approved: 6, pending: 2, status: '草稿' },
  { id: 'TSK-0243', level1: '公共场景', level2: '办公区', level2Task: '桌面清洁', example: '清理会议结束后的会议桌', steps: '收集杯具 → 丢弃垃圾 → 擦拭桌面 → 推回座椅', quantity: 8, total: 20, approved: 10, pending: 2, status: '已发布' },
]

const reviews = [
  { id: 'SUB-1084', taskId: 'TSK-0248', path: '家庭场景 / 厨房 / 餐具整理', vendor: '星尘智能科技', task: '将餐后餐具放入洗碗机', design: '清理四人晚餐后的陶瓷餐具', steps: ['识别餐桌上的碗、盘、杯子与餐具', '清除盘中剩余食物并分类叠放', '打开洗碗机，拉出下层碗篮', '按餐具类型依次摆放并关闭洗碗机'], submitted: '今天 10:32', approved: 3, status: '待审核' },
  { id: 'SUB-1083', taskId: 'TSK-0247', path: '家庭场景 / 客厅 / 物品归位', vendor: '灵巧机器人', task: '整理散落在沙发上的靠枕', design: '整理三人沙发上的不同尺寸靠枕', steps: ['识别沙发上三个不同尺寸的靠枕', '依次抓取靠枕并判断正反面', '将大靠枕摆放在沙发两侧', '把小靠枕居中摆放并调整朝向'], submitted: '昨天 16:45', approved: 2, status: '待审核' },
  { id: 'SUB-1082', taskId: 'TSK-0246', path: '商业场景 / 便利店 / 货架补货', vendor: '矩阵动力', task: '为饮料冷柜补充瓶装水', design: '从周转箱向双开门冷柜补货', steps: ['识别冷柜中的瓶装水空位', '将周转箱移动到冷柜前方', '按标签朝向逐瓶放入空位', '核对陈列数量并移走空箱'], submitted: '08月29日 14:20', approved: 5, status: '待审核' },
]

const approvedDesigns = [
  { id: 'SUB-1031', taskId: 'TSK-0248', name: '两人早餐餐具清理', vendor: '灵巧机器人', steps: ['识别早餐后的碗碟与杯具', '将剩余食物倒入厨余垃圾桶', '把杯具放入上层碗篮', '把碗碟按间距放入下层碗篮'] },
  { id: 'SUB-1018', taskId: 'TSK-0248', name: '包含玻璃杯的晚餐餐具整理', vendor: '矩阵动力', steps: ['识别玻璃杯与陶瓷餐具', '单独抓取易碎玻璃杯', '将玻璃杯倒置放入上层区域', '分类摆放碗盘并确认无碰撞'] },
  { id: 'SUB-0996', taskId: 'TSK-0248', name: '儿童餐具分类清洗准备', vendor: '原点数据', steps: ['识别儿童餐盘、勺子和水杯', '清除餐盘残渣', '将塑料餐具放入上层碗篮', '关闭碗篮并确认餐具稳定'] },
  { id: 'SUB-1024', taskId: 'TSK-0247', name: '双人沙发靠枕归位', vendor: '星尘智能科技', steps: ['识别两个方形靠枕', '判断沙发空闲区域', '将靠枕分别移动至左右两侧', '旋转图案至正向并拍平'] },
  { id: 'SUB-1007', taskId: 'TSK-0247', name: '混合材质靠枕整理', vendor: '矩阵动力', steps: ['区分绒面和棉麻靠枕', '按尺寸从大到小抓取', '沿沙发靠背依次摆放', '确认靠枕间距保持一致'] },
  { id: 'SUB-0988', taskId: 'TSK-0246', name: '冷柜矿泉水单排补货', vendor: '原点数据', steps: ['识别缺货货道', '从周转箱取出矿泉水', '标签朝外放入货道', '确认前后瓶身无倾倒'] },
]

const vendorAccounts = [
  { name: '星尘智能科技', contact: '陈思远', email: 'chen@stardust.ai', claimed: 18, passed: 12, status: '正常' },
  { name: '灵巧机器人', contact: '方宁', email: 'fang@dexbot.cn', claimed: 14, passed: 9, status: '正常' },
  { name: '矩阵动力', contact: '周启明', email: 'zhou@matrixlab.cn', claimed: 21, passed: 17, status: '正常' },
  { name: '原点数据', contact: '林夏', email: 'lin@origin-data.cn', claimed: 6, passed: 3, status: '已停用' },
]

function Badge({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'gray' | 'orange' | 'red' }) {
  return <span className={`badge ${tone}`}><i />{children}</span>
}

function Dashboard({ initialRole = 'admin', allowRoleSwitch = false }: { initialRole?: Role; allowRoleSwitch?: boolean }) {
  const [role, setRole] = useState<Role>(initialRole)
  const [page, setPage] = useState<Page>('tasks')
  const [tasks, setTasks] = useState(seedTasks)
  const [query, setQuery] = useState('')
  const [scene, setScene] = useState('全部场景')
  const [modal, setModal] = useState<'upload' | 'add' | 'claim' | 'review' | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [toast, setToast] = useState('')

  const switchRole = (next: Role) => {
    setRole(next)
    setPage(next === 'admin' ? 'tasks' : 'claim')
  }

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const matchesQuery = Object.values(task).some((value) => String(value).toLowerCase().includes(query.toLowerCase()))
    return matchesQuery && (scene === '全部场景' || task.level1 === scene)
  }), [tasks, query, scene])

  const openClaim = (task: Task) => {
    setActiveTask(task)
    setModal('claim')
  }

  const openTaskDetail = (task: Task) => {
    setActiveTask(task)
    setPage('taskDetail')
  }

  const removeTask = (id: string) => {
    setTasks((current) => current.filter((task) => task.id !== id))
    notify('任务已删除')
  }

  const nav = role === 'admin'
    ? [
        { id: 'tasks' as Page, label: '候选任务', icon: ListTodo },
        { id: 'reviews' as Page, label: '任务审核', icon: ClipboardCheck, count: 3 },
        { id: 'vendors' as Page, label: 'Vendor 管理', icon: UserRoundCog },
      ]
    : [
        { id: 'claim' as Page, label: '认领任务', icon: LayoutGrid },
        { id: 'results' as Page, label: '审核结果', icon: ShieldCheck, count: 2 },
      ]

  const pageMeta: Record<Page, [string, string]> = {
    tasks: ['候选任务列表', '管理具身智能数据采集任务池'],
    taskDetail: ['任务详情', '查看该候选任务下的全部设计与审核状态'],
    reviews: ['任务审核', '审核供应商提交的三级任务设计'],
    vendors: ['Vendor 账号', '管理供应商的访问权限与任务表现'],
    claim: ['认领任务', '选择合适的候选任务并提交你的设计'],
    results: ['审核结果', '查看已提交任务的审核进度与反馈'],
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><img src={logo} alt="Ropedia" /></div>
        <div className={`role-switch ${allowRoleSwitch ? '' : 'locked'}`}>
          <button className={role === 'admin' ? 'active' : ''} onClick={() => switchRole('admin')}>Admin</button>
          <button className={role === 'vendor' ? 'active' : ''} onClick={() => switchRole('vendor')}>Vendor</button>
        </div>
        <nav>
          <p className="nav-label">工作台</p>
          {nav.map((item) => (
            <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}>
              <item.icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
              {item.count && <em>{item.count}</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span><Users size={18} /></span>
            <strong>需要帮助？</strong>
            <p>查看任务提交流程与规范</p>
            <button>打开使用指南 <ChevronRight size={14} /></button>
          </div>
          <div className="user-card">
            <div className="avatar">{role === 'admin' ? 'AD' : '星'}</div>
            <div><strong>{role === 'admin' ? 'Admin Console' : '星尘智能科技'}</strong><small>{role === 'admin' ? '系统管理员' : 'Vendor account'}</small></div>
            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>

      <main>
        <header>
          <div className="breadcrumb"><span>任务注册中心</span><ChevronRight size={14} /><strong>{pageMeta[page][0]}</strong></div>
          <div className="header-actions">
            <button className="icon-btn"><Search size={18} /></button>
            <button className="icon-btn notification"><Bell size={18} /><i /></button>
          </div>
        </header>

        <section className="content">
          <div className="page-heading">
            <div><p className="eyebrow">TASK REGISTER / 2026</p><h1>{pageMeta[page][0]}</h1><p>{pageMeta[page][1]}</p></div>
            {page === 'tasks' && <div className="action-row"><button className="secondary" onClick={() => setModal('upload')}><Upload size={17} />批量上传 CSV</button><button className="primary" onClick={() => setModal('add')}><Plus size={17} />新建任务</button></div>}
          </div>

          {page === 'tasks' && <AdminTasks tasks={filteredTasks} query={query} setQuery={setQuery} scene={scene} setScene={setScene} onDelete={removeTask} onOpen={openTaskDetail} notify={notify} />}
          {page === 'taskDetail' && activeTask && <TaskDetail task={activeTask} back={() => setPage('tasks')} review={() => setModal('review')} />}
          {page === 'reviews' && <Reviews approve={() => setModal('review')} />}
          {page === 'vendors' && <Vendors notify={notify} />}
          {page === 'claim' && <ClaimTasks tasks={filteredTasks} query={query} setQuery={setQuery} onClaim={openClaim} />}
          {page === 'results' && <Results />}
        </section>
      </main>

      {modal === 'upload' && <UploadModal close={() => setModal(null)} notify={notify} />}
      {modal === 'add' && <AddTaskModal close={() => setModal(null)} onAdd={(task) => { setTasks((current) => [task, ...current]); setModal(null); notify('新任务已创建') }} />}
      {modal === 'claim' && activeTask && <ClaimModal task={activeTask} close={() => setModal(null)} submit={() => { setModal(null); notify('任务设计已提交审核') }} />}
      {modal === 'review' && <ReviewModal close={() => setModal(null)} notify={(message) => { setModal(null); notify(message) }} />}
      {toast && <div className="toast"><CircleCheck size={18} />{toast}</div>}
    </div>
  )
}

function FilterBar({ query, setQuery, children }: { query: string; setQuery: (value: string) => void; children?: React.ReactNode }) {
  return <div className="filter-bar"><div className="search-box"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索任务名称、场景或编号..." /></div>{children}<button className="filter-button">上传状态 <ChevronDown size={15} /></button></div>
}

function AdminTasks({ tasks, query, setQuery, scene, setScene, onDelete, onOpen, notify }: { tasks: Task[]; query: string; setQuery: (v: string) => void; scene: string; setScene: (v: string) => void; onDelete: (id: string) => void; onOpen: (task: Task) => void; notify: (v: string) => void }) {
  return <>
    <div className="stats-grid">
      <div className="stat-card accent"><span>候选任务总数</span><strong>248</strong><small>较上月 <b>+12.5%</b></small><ListTodo /></div>
      <div className="stat-card"><span>待认领数量</span><strong>92</strong><small>分布于 18 个任务</small><LayoutGrid /></div>
      <div className="stat-card"><span>待审核提交</span><strong>03</strong><small>最早等待 18 小时</small><ClipboardCheck /></div>
      <div className="stat-card"><span>合作 Vendor</span><strong>12</strong><small>本月新增 2 家</small><Users /></div>
    </div>
    <div className="panel">
      <FilterBar query={query} setQuery={setQuery}>
        <select value={scene} onChange={(e) => setScene(e.target.value)}><option>全部场景</option><option>家庭场景</option><option>商业场景</option><option>工业场景</option><option>公共场景</option></select>
      </FilterBar>
      <div className="table-wrap"><table><thead><tr><th><input type="checkbox" /></th><th>任务编号</th><th>一级 / 二级场景</th><th>二级任务</th><th>三级任务示例名称</th><th>总数</th><th>已通过</th><th>待审核</th><th>剩余</th><th>上传状态</th><th /></tr></thead>
        <tbody>{tasks.map((task) => <tr key={task.id}><td><input type="checkbox" /></td><td><button className="task-link" onClick={() => onOpen(task)}>{task.id}</button></td><td><strong>{task.level1}</strong><small>{task.level2}</small></td><td>{task.level2Task}</td><td><button className="name-link" onClick={() => onOpen(task)}><strong>{task.example}</strong><small className="truncate">{task.steps}</small></button></td><td><span className="count-cell">{task.total}</span></td><td><span className="count-cell approved">{task.approved}</span></td><td><span className="count-cell pending">{task.pending}</span></td><td><span className={task.quantity ? 'quantity' : 'quantity zero'}>{String(task.quantity).padStart(2, '0')}</span></td><td><Badge tone={task.status === '已发布' ? 'green' : 'gray'}>{task.status}</Badge></td><td><div className="row-actions"><button onClick={() => notify('编辑功能已打开')}><Pencil size={15} /></button><button onClick={() => onDelete(task.id)}><Trash2 size={15} /></button><button><MoreHorizontal size={17} /></button></div></td></tr>)}</tbody>
      </table></div>
      <Pagination total={tasks.length} />
    </div>
  </>
}

function TaskDetail({ task, back, review }: { task: Task; back: () => void; review: () => void }) {
  const pendingItems = reviews.filter((item) => item.taskId === task.id)
  const passedItems = approvedDesigns.filter((item) => item.taskId === task.id)
  return <div className="task-detail">
    <button className="back-button" onClick={back}><ChevronLeft size={16} />返回候选任务列表</button>
    <div className="detail-hero">
      <div><span>{task.id} · {task.level1} / {task.level2} / {task.level2Task}</span><h2>{task.example}</h2><p>{task.steps}</p></div>
      <Badge tone={task.status === '已发布' ? 'green' : 'gray'}>{task.status}</Badge>
    </div>
    <div className="detail-metrics">
      <div><span>任务总数</span><strong>{task.total}</strong></div>
      <div><span>已审核通过</span><strong>{task.approved}</strong></div>
      <div><span>待审核</span><strong>{task.pending}</strong></div>
      <div><span>剩余可认领</span><strong>{task.quantity}</strong></div>
    </div>
    <section className="detail-section panel">
      <div className="detail-section-title"><div><h3>待审核任务</h3><p>Vendor 已提交、等待 Admin 处理的设计</p></div><Badge tone="orange">{task.pending} 个待审核</Badge></div>
      <div className="design-table">{pendingItems.length ? pendingItems.map((item) => <article key={item.id}><div className="design-status"><span>{item.id}</span><Badge tone="orange">待审核</Badge></div><div><strong>{item.design}</strong><p>Vendor：{item.vendor} · 提交于 {item.submitted}</p></div><div className="inline-steps"><span>任务步骤</span><p>{item.steps.join(' → ')}</p></div><button className="secondary" onClick={review}>开始审核</button></article>) : <p className="empty-state">当前没有待审核任务</p>}</div>
    </section>
    <section className="detail-section panel">
      <div className="detail-section-title"><div><h3>已通过任务</h3><p>已计入该候选任务交付数量的设计</p></div><Badge>{task.approved} 个已通过</Badge></div>
      <div className="approved-designs detail-approved">{passedItems.length ? passedItems.map((design) => <article key={design.id}><div><span>{design.id}</span><Badge>已通过</Badge></div><h4>{design.name}</h4><p>Vendor：{design.vendor}</p><ol>{design.steps.map((step, index) => <li key={step}><i>{String(index + 1).padStart(2, '0')}</i>{step}</li>)}</ol></article>) : <p className="empty-state">当前没有已通过任务</p>}</div>
    </section>
  </div>
}

function Reviews({ approve }: { approve: () => void }) {
  const [selected, setSelected] = useState(0)
  const [sceneFilter, setSceneFilter] = useState('全部一级场景')
  const [taskFilter, setTaskFilter] = useState('全部任务')
  const [vendorFilter, setVendorFilter] = useState('全部 Vendor')
  const filteredReviews = reviews.filter((item) =>
    (sceneFilter === '全部一级场景' || item.path.startsWith(sceneFilter)) &&
    (taskFilter === '全部任务' || item.path.includes(taskFilter)) &&
    (vendorFilter === '全部 Vendor' || item.vendor === vendorFilter)
  )
  const current = filteredReviews[selected] || filteredReviews[0]
  if (!current) return <div className="panel empty-state"><p>没有符合当前筛选条件的待审核任务</p><button className="secondary" onClick={() => { setSceneFilter('全部一级场景'); setTaskFilter('全部任务'); setVendorFilter('全部 Vendor'); setSelected(0) }}>清除筛选</button></div>
  const sameLevelApproved = approvedDesigns.filter((design) => design.taskId === current.taskId)
  return <>
    <div className="review-filters">
      <div className="search-box"><Search size={17} /><input placeholder="搜索提交名称或编号..." /></div>
      <select value={sceneFilter} onChange={(e) => { setSceneFilter(e.target.value); setSelected(0) }}><option>全部一级场景</option><option>家庭场景</option><option>商业场景</option><option>工业场景</option></select>
      <select value={taskFilter} onChange={(e) => { setTaskFilter(e.target.value); setSelected(0) }}><option>全部任务</option><option>餐具整理</option><option>物品归位</option><option>货架补货</option></select>
      <select value={vendorFilter} onChange={(e) => { setVendorFilter(e.target.value); setSelected(0) }}><option>全部 Vendor</option>{vendorAccounts.map((vendor) => <option key={vendor.name}>{vendor.name}</option>)}</select>
    </div>
    <div className="review-layout"><div className="panel review-list"><div className="panel-title"><div><h3>待审核队列</h3><p>按提交时间排序</p></div><Badge tone="orange">{filteredReviews.length} 个待处理</Badge></div>{filteredReviews.map((item, index) => <button className={`review-item ${index === selected ? 'selected' : ''}`} key={item.id} onClick={() => setSelected(index)}><div className="review-top"><span>{item.id}</span><small>{item.submitted}</small></div><strong>{item.design}</strong><p>{item.vendor} · 基于「{item.task}」</p><div><Badge tone="orange">待审核</Badge><span>已有 {item.approved} 个设计通过</span></div></button>)}</div>
      <div className="review-preview"><div className="preview-hero"><span>当前审核</span><h2>{current.design}</h2><p>供应商：{current.vendor}　·　提交于{current.submitted}</p></div><div className="preview-body"><section><label>关联候选任务</label><div className="linked-task"><ListTodo size={19} /><div><strong>{current.task}</strong><small>{current.path}</small></div><span>{current.taskId}</span></div></section><section><label>待审核任务步骤</label><ol>{current.steps.map((step, index) => <li key={step}><i>{String(index + 1).padStart(2, '0')}</i>{step}</li>)}</ol></section><section><label>已通过的同级任务完整清单 <span>{sameLevelApproved.length}</span></label><div className="approved-designs">{sameLevelApproved.map((design) => <article key={design.id}><div><span>{design.id}</span><Badge>已通过</Badge></div><h4>{design.name}</h4><p>Vendor：{design.vendor}</p><ol>{design.steps.map((step, index) => <li key={step}><i>{String(index + 1).padStart(2, '0')}</i>{step}</li>)}</ol></article>)}</div></section><div className="review-actions"><button className="danger">退回修改</button><button className="primary" onClick={approve}><Check size={17} />通过审核</button></div></div></div></div>
  </>
}

function Vendors({ notify }: { notify: (v: string) => void }) {
  return <div className="panel"><div className="filter-bar"><div className="search-box"><Search size={17} /><input placeholder="搜索公司、联系人或邮箱..." /></div><button className="filter-button">账号状态 <ChevronDown size={15} /></button><button className="primary" onClick={() => notify('邀请链接已复制')}><Plus size={17} />邀请 Vendor</button></div><div className="table-wrap"><table><thead><tr><th>Vendor 公司</th><th>联系人</th><th>邮箱</th><th>已认领</th><th>已通过</th><th>通过率</th><th>账号状态</th><th /></tr></thead><tbody>{vendorAccounts.map((vendor) => <tr key={vendor.name}><td><div className="company"><span>{vendor.name[0]}</span><strong>{vendor.name}</strong></div></td><td>{vendor.contact}</td><td>{vendor.email}</td><td>{vendor.claimed}</td><td>{vendor.passed}</td><td>{Math.round(vendor.passed / vendor.claimed * 100)}%</td><td><Badge tone={vendor.status === '正常' ? 'green' : 'red'}>{vendor.status}</Badge></td><td><button className="plain-btn"><MoreHorizontal size={18} /></button></td></tr>)}</tbody></table></div><Pagination total={4} /></div>
}

function ClaimTasks({ tasks, query, setQuery, onClaim }: { tasks: Task[]; query: string; setQuery: (v: string) => void; onClaim: (task: Task) => void }) {
  const available = tasks.filter((task) => task.quantity > 0 && task.status === '已发布')
  return <><div className="vendor-banner compact"><div><span>AVAILABLE TASKS</span><h2>找到适合你的采集任务</h2><p>任务库支持数千条三级任务的快速检索与批量浏览</p></div><div className="orb"><span>92</span><small>OPEN</small></div></div><div className="panel"><FilterBar query={query} setQuery={setQuery}><button className="filter-button">一级场景 <ChevronDown size={15} /></button><button className="filter-button">二级任务 <ChevronDown size={15} /></button></FilterBar><div className="table-wrap vendor-task-table"><table><thead><tr><th>任务编号</th><th>一级 / 二级场景</th><th>二级任务</th><th>三级任务名称与步骤</th><th>已通过</th><th>可认领数量</th><th /></tr></thead><tbody>{available.map((task) => <tr key={task.id}><td><span className="task-id">{task.id}</span></td><td><strong>{task.level1}</strong><small>{task.level2}</small></td><td>{task.level2Task}</td><td><strong>{task.example}</strong><small className="vendor-step">{task.steps}</small></td><td><span className="count-cell approved">{task.approved}</span></td><td><Badge>{task.quantity} 个</Badge></td><td><button className="claim-button" onClick={() => onClaim(task)}>认领并设计 <ChevronRight size={15} /></button></td></tr>)}</tbody></table></div><Pagination total={2846} /></div></>
}

function Results() {
  const resultRows = [
    { id: 'SUB-1076', name: '清理双人早餐后的餐具', task: '餐具整理', date: '2026-08-29', status: '审核通过', tone: 'green' as const, note: '设计清晰，可直接执行' },
    { id: 'SUB-1072', name: '整理 L 型沙发上的靠枕', task: '物品归位', date: '2026-08-28', status: '需要修改', tone: 'orange' as const, note: '请补充靠枕朝向判定规则' },
    { id: 'SUB-1064', name: '为会议室桌面做会后清理', task: '桌面清洁', date: '2026-08-25', status: '审核中', tone: 'gray' as const, note: '预计 24 小时内完成' },
  ]
  return <div className="panel result-panel"><div className="result-tabs"><button className="active">全部提交 <span>12</span></button><button>审核中 <span>1</span></button><button>已通过 <span>9</span></button><button>需修改 <span>2</span></button></div>{resultRows.map((row) => <div className="result-row" key={row.id}><div className="result-icon"><ClipboardCheck /></div><div className="result-main"><span>{row.id} · {row.task}</span><strong>{row.name}</strong><small>提交于 {row.date}</small></div><p>{row.note}</p><Badge tone={row.tone}>{row.status}</Badge><ChevronRight size={18} /></div>)}</div>
}

function Pagination({ total }: { total: number }) {
  return <div className="pagination"><span>显示 1–{total}，共 {total} 条</span><div><button><ChevronLeft size={16} /></button><button className="active">1</button><button>2</button><button>3</button><button><ChevronRight size={16} /></button></div></div>
}

function Modal({ children, close, wide = false }: { children: React.ReactNode; close: () => void; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={close}><div className={`modal ${wide ? 'wide' : ''}`} onMouseDown={(e) => e.stopPropagation()}>{children}<button className="modal-close" onClick={close}><X size={19} /></button></div></div>
}

function UploadModal({ close, notify }: { close: () => void; notify: (v: string) => void }) {
  return <Modal close={close}><div className="modal-heading"><span><FileUp /></span><div><h2>批量上传候选任务</h2><p>通过 CSV 文件一次导入多个任务</p></div></div><div className="upload-zone"><Upload size={25} /><strong>拖拽 CSV 文件到这里</strong><p>或点击浏览本地文件，最大 10MB</p><button>选择文件</button></div><div className="template-row"><div><strong>还没有模板？</strong><p>下载标准 CSV 模板，按照字段示例填写</p></div><button>下载 CSV 模板</button></div><div className="modal-actions"><button className="secondary" onClick={close}>取消</button><button className="primary" onClick={() => { close(); notify('CSV 文件已成功导入') }}>开始上传</button></div></Modal>
}

function AddTaskModal({ close, onAdd }: { close: () => void; onAdd: (task: Task) => void }) {
  const [name, setName] = useState('')
  return <Modal close={close} wide><div className="modal-heading"><span><Plus /></span><div><h2>新建候选任务</h2><p>填写任务分类、示例设计与开放数量</p></div></div><div className="form-grid"><label>一级场景<select><option>家庭场景</option><option>商业场景</option><option>工业场景</option></select></label><label>二级场景<input placeholder="例如：厨房" /></label><label>二级任务<input placeholder="例如：餐具整理" /></label><label>任务数量<input type="number" defaultValue={10} /></label><label className="full">三级任务示例名称<input value={name} onChange={(e) => setName(e.target.value)} placeholder="输入清晰、具体的任务示例" /></label><label className="full">三级示例任务步骤<textarea placeholder="按执行顺序描述任务步骤..." /></label></div><div className="modal-actions"><button className="secondary" onClick={close}>存为草稿</button><button className="primary" onClick={() => onAdd({ id: `TSK-${250 + Math.floor(Math.random() * 100)}`, level1: '家庭场景', level2: '厨房', level2Task: '物品整理', example: name || '未命名任务示例', steps: '待补充详细任务步骤', quantity: 10, total: 10, approved: 0, pending: 0, status: '已发布' })}>创建并发布</button></div></Modal>
}

function ClaimModal({ task, close, submit }: { task: Task; close: () => void; submit: () => void }) {
  return <Modal close={close} wide><div className="modal-heading"><span><ClipboardCheck /></span><div><h2>认领并设计任务</h2><p>{task.id} · {task.level1} / {task.level2} / {task.level2Task}</p></div></div><div className="claim-source"><label>候选任务示例</label><strong>{task.example}</strong><p>{task.steps}</p></div><div className="form-grid"><label className="full">你的三级任务名称<input placeholder="请提交不同于已有设计的具体任务名称" /></label><label className="full">三级任务步骤<textarea placeholder={'1. 描述机器人首先需要完成的动作\n2. 继续添加可执行、可验证的步骤\n3. 明确任务的完成状态'} /></label><label>认领数量<select><option>1 个任务设计</option><option>2 个任务设计</option><option>3 个任务设计</option></select></label></div><div className="notice"><ShieldCheck size={17} /><span>提交后将进入 Admin 审核队列，通过后才会计入任务数量。</span></div><div className="modal-actions"><button className="secondary" onClick={close}>取消</button><button className="primary" onClick={submit}>提交审核</button></div></Modal>
}

function ReviewModal({ close, notify }: { close: () => void; notify: (v: string) => void }) {
  return <Modal close={close}><div className="modal-heading"><span><ShieldCheck /></span><div><h2>确认审核结果</h2><p>SUB-1084 · 星尘智能科技</p></div></div><div className="decision-card"><CircleCheck size={30} /><strong>通过该任务设计？</strong><p>通过后，该设计将加入已审核任务库，并通知供应商。</p></div><label className="note-field">审核备注（可选）<textarea placeholder="输入对供应商可见的审核意见..." /></label><div className="modal-actions split"><button className="danger" onClick={() => notify('已退回供应商修改')}>退回修改</button><button className="primary" onClick={() => notify('任务设计已通过审核')}><Check size={17} />确认通过</button></div></Modal>
}

export default Dashboard
