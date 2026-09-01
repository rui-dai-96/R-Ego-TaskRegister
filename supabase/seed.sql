-- Local development accounts:
-- admin@ropedia.local / AdminDemo!2026
-- stardust@ropedia.local / VendorDemo!2026
-- matrix@ropedia.local / VendorDemo!2026
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'admin@ropedia.local', extensions.crypt('AdminDemo!2026', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Ropedia Admin"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'stardust@ropedia.local', extensions.crypt('VendorDemo!2026', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"星尘智能科技"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'matrix@ropedia.local', extensions.crypt('VendorDemo!2026', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"矩阵动力"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
values
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'admin@ropedia.local', '{"sub":"10000000-0000-0000-0000-000000000001","email":"admin@ropedia.local"}', 'email', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'stardust@ropedia.local', '{"sub":"20000000-0000-0000-0000-000000000001","email":"stardust@ropedia.local"}', 'email', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
   'matrix@ropedia.local', '{"sub":"20000000-0000-0000-0000-000000000002","email":"matrix@ropedia.local"}', 'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

insert into public.profiles (id, role, display_name, must_change_password)
values
  ('10000000-0000-0000-0000-000000000001', 'admin', 'Ropedia Admin', false),
  ('20000000-0000-0000-0000-000000000001', 'vendor', '星尘智能科技', false),
  ('20000000-0000-0000-0000-000000000002', 'vendor', '矩阵动力', false)
on conflict (id) do update
set role = excluded.role,
    display_name = excluded.display_name,
    must_change_password = excluded.must_change_password;

insert into public.vendors (
  id, profile_id, company_name, contact_name, contact_email, status, created_by
)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '星尘智能科技', '陈星', 'stardust@ropedia.local', 'active', '10000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
   '矩阵动力', '林然', 'matrix@ropedia.local', 'active', '10000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.candidate_tasks (
  id, task_code, level_one_scene, level_two_scene, level_two_task,
  example_name, example_steps, target_count, status, created_by
)
values
  ('40000000-0000-0000-0000-000000000248', 'TSK-0248', '家庭场景', '厨房', '餐具整理',
   '将餐后餐具放入洗碗机', '识别餐具 → 分类收集 → 打开洗碗机 → 依次放入',
   40, 'published', '10000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000247', 'TSK-0247', '家庭场景', '客厅', '物品归位',
   '整理散落在沙发上的靠枕', '识别靠枕 → 抓取 → 调整朝向 → 整齐摆放',
   30, 'published', '10000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000246', 'TSK-0246', '商业场景', '便利店', '货架补货',
   '为饮料冷柜补充瓶装水', '扫描缺货位 → 搬运货箱 → 拆箱 → 按标签补货',
   50, 'published', '10000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000244', 'TSK-0244', '家庭场景', '卧室', '床铺整理',
   '铺平床单并摆放枕头', '拉平床单 → 整理四角 → 拍松枕头 → 靠床头摆放',
   20, 'draft', '10000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.task_submissions (
  id, submission_code, candidate_task_id, vendor_id, design_name, status, reviewed_at
)
values
  ('50000000-0000-0000-0000-000000001031', 'SUB-1031', '40000000-0000-0000-0000-000000000248',
   '30000000-0000-0000-0000-000000000002', '两人早餐餐具清理', 'approved', now() - interval '2 days'),
  ('50000000-0000-0000-0000-000000001084', 'SUB-1084', '40000000-0000-0000-0000-000000000248',
   '30000000-0000-0000-0000-000000000001', '清理四人晚餐后的陶瓷餐具', 'pending', null),
  ('50000000-0000-0000-0000-000000001082', 'SUB-1082', '40000000-0000-0000-0000-000000000246',
   '30000000-0000-0000-0000-000000000002', '从周转箱向双开门冷柜补货', 'revision_required', now() - interval '1 day')
on conflict (id) do nothing;

insert into public.submission_steps (submission_id, position, instruction)
values
  ('50000000-0000-0000-0000-000000001031', 1, '识别早餐后的碗碟与杯具'),
  ('50000000-0000-0000-0000-000000001031', 2, '将剩余食物倒入厨余垃圾桶'),
  ('50000000-0000-0000-0000-000000001031', 3, '把杯具放入上层碗篮'),
  ('50000000-0000-0000-0000-000000001031', 4, '把碗碟按间距放入下层碗篮'),
  ('50000000-0000-0000-0000-000000001084', 1, '识别餐桌上的碗、盘、杯子与餐具'),
  ('50000000-0000-0000-0000-000000001084', 2, '清除盘中剩余食物并分类叠放'),
  ('50000000-0000-0000-0000-000000001084', 3, '打开洗碗机并拉出下层碗篮'),
  ('50000000-0000-0000-0000-000000001084', 4, '按餐具类型依次摆放并关闭洗碗机'),
  ('50000000-0000-0000-0000-000000001082', 1, '识别冷柜中的瓶装水空位'),
  ('50000000-0000-0000-0000-000000001082', 2, '将周转箱移动到冷柜前方'),
  ('50000000-0000-0000-0000-000000001082', 3, '按标签朝向逐瓶放入空位'),
  ('50000000-0000-0000-0000-000000001082', 4, '核对陈列数量并移走空箱')
on conflict (submission_id, position) do nothing;

insert into public.review_records (
  submission_id, reviewer_id, prior_status, decision, feedback, created_at
)
values
  ('50000000-0000-0000-0000-000000001031', '10000000-0000-0000-0000-000000000001',
   'pending', 'approved', '步骤清晰，可执行。', now() - interval '2 days'),
  ('50000000-0000-0000-0000-000000001082', '10000000-0000-0000-0000-000000000001',
   'pending', 'revision_required', '请补充拆箱和包装材料处理步骤。', now() - interval '1 day');
