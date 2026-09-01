begin;
select plan(6);

select is(
  (select target_count from public.candidate_tasks where task_code = 'TSK-0248'),
  40,
  'seeded task keeps its target count'
);

select is(
  (select approved_count from public.candidate_tasks where task_code = 'TSK-0248'),
  1,
  'approved count is derived from submissions'
);

select is(
  (select pending_count from public.candidate_tasks where task_code = 'TSK-0248'),
  1,
  'pending count is derived from submissions'
);

select is(
  (select available_count from public.candidate_tasks where task_code = 'TSK-0248'),
  38,
  'available count is generated from target, approved and pending'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select ok(public.is_admin(), 'seeded admin is recognized by authorization helper');
select is(
  (select count(*)::integer from public.candidate_tasks),
  4,
  'admin can read draft and published candidate tasks'
);

select * from finish();
rollback;
