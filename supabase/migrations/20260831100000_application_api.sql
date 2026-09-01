create sequence if not exists public.task_code_seq start with 249;

alter table public.candidate_tasks
alter column task_code set default (
  'TSK-' || lpad(nextval('public.task_code_seq')::text, 4, '0')
);
grant usage on sequence public.task_code_seq to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, display_name, must_change_password)
  values (
    new.id,
    'vendor',
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace view public.vendor_metrics
with (security_invoker = true)
as
select
  v.id,
  v.company_name as name,
  v.contact_name,
  v.contact_email,
  case when v.status = 'disabled' then 'disabled' else 'active' end as status,
  v.created_at,
  count(s.id)::integer as claimed_count,
  count(s.id) filter (where s.status = 'approved')::integer as approved_count
from public.vendors v
left join public.task_submissions s on s.vendor_id = v.id
group by v.id;

grant select on public.vendor_metrics to authenticated;

create or replace function public.get_candidate_task_stats()
returns table (
  task_count bigint,
  target_count bigint,
  approved_count bigint,
  pending_count bigint,
  available_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can view global task statistics' using errcode = '42501';
  end if;
  return query
  select count(*), coalesce(sum(t.target_count), 0), coalesce(sum(t.approved_count), 0),
    coalesce(sum(t.pending_count), 0), coalesce(sum(t.available_count), 0)
  from public.candidate_tasks t;
end;
$$;

revoke all on function public.get_candidate_task_stats() from public;
grant execute on function public.get_candidate_task_stats() to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'task_submissions'
  ) then
    alter publication supabase_realtime add table public.task_submissions;
  end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('csv-imports', 'csv-imports', false, 10485760, array['text/csv', 'application/vnd.ms-excel'])
on conflict (id) do nothing;

create policy "admins_upload_csv_imports" on storage.objects
for insert to authenticated
with check (bucket_id = 'csv-imports' and public.is_admin());

create policy "admins_read_csv_imports" on storage.objects
for select to authenticated
using (bucket_id = 'csv-imports' and public.is_admin());

create policy "admins_delete_csv_imports" on storage.objects
for delete to authenticated
using (bucket_id = 'csv-imports' and public.is_admin());

create policy "profiles_update_first_login_flag" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

grant update (must_change_password, last_sign_in_at) on public.profiles to authenticated;

create or replace function public.import_candidate_tasks(
  p_tasks jsonb,
  p_file_name text,
  p_storage_path text default null
)
returns public.csv_imports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_import public.csv_imports;
  v_item jsonb;
  v_steps text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can import candidate tasks' using errcode = '42501';
  end if;
  if jsonb_typeof(p_tasks) <> 'array' or jsonb_array_length(p_tasks) = 0 then
    raise exception 'Import must contain at least one task' using errcode = '22023';
  end if;

  insert into public.csv_imports (
    filename, storage_path, status, total_rows, imported_by, started_at
  ) values (
    btrim(p_file_name), p_storage_path, 'processing', jsonb_array_length(p_tasks),
    (select auth.uid()), now()
  ) returning * into v_import;

  for v_item in select value from jsonb_array_elements(p_tasks) loop
    select string_agg(value #>> '{}', ' → ' order by ordinality)
    into v_steps
    from jsonb_array_elements(v_item -> 'example_steps') with ordinality;

    insert into public.candidate_tasks (
      task_code, level_one_scene, level_two_scene, level_two_task,
      example_name, example_steps, target_count, status, created_by
    ) values (
      'TSK-' || lpad(nextval('public.task_code_seq')::text, 4, '0'),
      btrim(v_item ->> 'level1_scene'),
      btrim(v_item ->> 'level2_scene'),
      btrim(v_item ->> 'level2_task'),
      btrim(v_item ->> 'example_name'),
      v_steps,
      (v_item ->> 'target_count')::integer,
      (v_item ->> 'status')::public.task_status,
      (select auth.uid())
    );
  end loop;

  update public.csv_imports
  set status = 'completed',
      successful_rows = total_rows,
      completed_at = now()
  where id = v_import.id
  returning * into v_import;

  return v_import;
exception when others then
  if v_import.id is not null then
    update public.csv_imports
    set status = 'failed',
        failed_rows = total_rows,
        errors = jsonb_build_array(jsonb_build_object('message', sqlerrm)),
        completed_at = now()
    where id = v_import.id;
  end if;
  raise;
end;
$$;

revoke all on function public.import_candidate_tasks(jsonb, text, text) from public;
grant execute on function public.import_candidate_tasks(jsonb, text, text) to authenticated;

create or replace function public.resubmit_task_design(
  p_submission_id uuid,
  p_design_name text,
  p_steps text[]
)
returns public.task_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission public.task_submissions;
  v_step text;
  v_position integer := 0;
begin
  select * into v_submission
  from public.task_submissions
  where id = p_submission_id
  for update;

  if not found or v_submission.vendor_id <> public.current_vendor_id() then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;
  if v_submission.status <> 'revision_required' then
    raise exception 'Only submissions requiring revision can be resubmitted' using errcode = '55000';
  end if;
  if length(btrim(coalesce(p_design_name, ''))) < 3
    or coalesce(array_length(p_steps, 1), 0) < 1
    or array_length(p_steps, 1) > 100 then
    raise exception 'A valid name and 1 to 100 steps are required' using errcode = '22023';
  end if;

  delete from public.submission_steps where submission_id = p_submission_id;
  foreach v_step in array p_steps loop
    v_position := v_position + 1;
    insert into public.submission_steps (submission_id, position, instruction)
    values (p_submission_id, v_position, btrim(v_step));
  end loop;

  update public.task_submissions
  set design_name = btrim(p_design_name),
      status = 'pending',
      submitted_at = now(),
      reviewed_at = null
  where id = p_submission_id
  returning * into v_submission;

  return v_submission;
end;
$$;

revoke all on function public.resubmit_task_design(uuid, text, text[]) from public;
grant execute on function public.resubmit_task_design(uuid, text, text[]) to authenticated;
