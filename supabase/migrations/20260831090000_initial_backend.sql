create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('admin', 'vendor');
create type public.vendor_status as enum ('invited', 'active', 'disabled');
create type public.task_status as enum ('draft', 'published', 'archived');
create type public.submission_status as enum ('pending', 'approved', 'revision_required', 'rejected', 'withdrawn');
create type public.review_decision as enum ('approved', 'revision_required', 'rejected');
create type public.csv_import_status as enum ('pending', 'processing', 'completed', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'vendor',
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  must_change_password boolean not null default true,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendors (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  company_name text not null check (length(btrim(company_name)) between 1 and 160),
  contact_name text,
  contact_email text not null,
  status public.vendor_status not null default 'invited',
  disabled_at timestamptz,
  disabled_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendors_disabled_state check (
    (status = 'disabled' and disabled_at is not null)
    or (status <> 'disabled' and disabled_at is null)
  )
);

create unique index vendors_contact_email_unique on public.vendors (lower(contact_email));
create index vendors_status_idx on public.vendors (status);

create table public.candidate_tasks (
  id uuid primary key default extensions.gen_random_uuid(),
  task_code text not null unique check (task_code ~ '^TSK-[0-9]{4,}$'),
  level_one_scene text not null check (length(btrim(level_one_scene)) between 1 and 120),
  level_two_scene text not null check (length(btrim(level_two_scene)) between 1 and 120),
  level_two_task text not null check (length(btrim(level_two_task)) between 1 and 160),
  example_name text not null check (length(btrim(example_name)) between 1 and 240),
  example_steps text not null check (length(btrim(example_steps)) between 1 and 4000),
  target_count integer not null check (target_count > 0),
  approved_count integer not null default 0 check (approved_count >= 0),
  pending_count integer not null default 0 check (pending_count >= 0),
  available_count integer generated always as (target_count - approved_count - pending_count) stored,
  status public.task_status not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidate_task_counts_valid check (
    approved_count + pending_count <= target_count
  )
);

create index candidate_tasks_discovery_idx
  on public.candidate_tasks (status, available_count desc, created_at desc);
create index candidate_tasks_taxonomy_idx
  on public.candidate_tasks (level_one_scene, level_two_scene, level_two_task);

create table public.task_submissions (
  id uuid primary key default extensions.gen_random_uuid(),
  submission_code text not null unique,
  candidate_task_id uuid not null references public.candidate_tasks(id) on delete restrict,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  design_name text not null check (length(btrim(design_name)) between 3 and 240),
  status public.submission_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviewed_status_timestamp check (
    (status = 'pending' and reviewed_at is null)
    or (status <> 'pending')
  )
);

create unique index task_submissions_unique_design
  on public.task_submissions (candidate_task_id, lower(design_name))
  where status <> 'withdrawn';
create index task_submissions_review_queue_idx
  on public.task_submissions (status, submitted_at);
create index task_submissions_vendor_idx
  on public.task_submissions (vendor_id, created_at desc);
create index task_submissions_task_idx
  on public.task_submissions (candidate_task_id, status);

create table public.submission_steps (
  id uuid primary key default extensions.gen_random_uuid(),
  submission_id uuid not null references public.task_submissions(id) on delete cascade,
  position integer not null check (position between 1 and 100),
  instruction text not null check (length(btrim(instruction)) between 2 and 1000),
  created_at timestamptz not null default now(),
  unique (submission_id, position)
);

create index submission_steps_submission_idx
  on public.submission_steps (submission_id, position);

create table public.review_records (
  id uuid primary key default extensions.gen_random_uuid(),
  submission_id uuid not null references public.task_submissions(id) on delete restrict,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  prior_status public.submission_status not null,
  decision public.review_decision not null,
  feedback text,
  created_at timestamptz not null default now(),
  constraint review_feedback_required check (
    decision = 'approved'
    or length(btrim(coalesce(feedback, ''))) >= 5
  )
);

create index review_records_submission_idx
  on public.review_records (submission_id, created_at desc);
create index review_records_reviewer_idx
  on public.review_records (reviewer_id, created_at desc);

create table public.csv_imports (
  id uuid primary key default extensions.gen_random_uuid(),
  filename text not null check (length(btrim(filename)) between 1 and 255),
  storage_path text,
  status public.csv_import_status not null default 'pending',
  total_rows integer not null default 0 check (total_rows >= 0),
  successful_rows integer not null default 0 check (successful_rows >= 0),
  failed_rows integer not null default 0 check (failed_rows >= 0),
  errors jsonb not null default '[]'::jsonb check (jsonb_typeof(errors) = 'array'),
  imported_by uuid not null references public.profiles(id) on delete restrict,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint csv_import_counts_valid check (
    successful_rows + failed_rows <= total_rows
  )
);

create index csv_imports_created_idx on public.csv_imports (created_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  occurred_at timestamptz not null default now()
);

create index audit_logs_actor_idx on public.audit_logs (actor_id, occurred_at desc);
create index audit_logs_record_idx on public.audit_logs (table_name, record_id, occurred_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger vendors_set_updated_at before update on public.vendors
for each row execute function public.set_updated_at();
create trigger candidate_tasks_set_updated_at before update on public.candidate_tasks
for each row execute function public.set_updated_at();
create trigger task_submissions_set_updated_at before update on public.task_submissions
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.current_vendor_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select v.id
  from public.vendors v
  join public.profiles p on p.id = v.profile_id
  where p.id = (select auth.uid())
    and p.role = 'vendor'
    and v.status = 'active';
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.current_vendor_id() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_vendor_id() to authenticated;

create or replace function public.recalculate_candidate_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_task_id uuid := coalesce(new.candidate_task_id, old.candidate_task_id);
begin
  update public.candidate_tasks t
  set
    approved_count = (
      select count(*)::integer from public.task_submissions s
      where s.candidate_task_id = affected_task_id and s.status = 'approved'
    ),
    pending_count = (
      select count(*)::integer from public.task_submissions s
      where s.candidate_task_id = affected_task_id and s.status = 'pending'
    )
  where t.id = affected_task_id;

  if tg_op = 'UPDATE' and old.candidate_task_id <> new.candidate_task_id then
    update public.candidate_tasks t
    set
      approved_count = (
        select count(*)::integer from public.task_submissions s
        where s.candidate_task_id = old.candidate_task_id and s.status = 'approved'
      ),
      pending_count = (
        select count(*)::integer from public.task_submissions s
        where s.candidate_task_id = old.candidate_task_id and s.status = 'pending'
      )
    where t.id = old.candidate_task_id;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger task_submissions_recalculate_counts
after insert or delete or update of status, candidate_task_id on public.task_submissions
for each row execute function public.recalculate_candidate_counts();

create sequence public.submission_code_seq start with 1085;

create or replace function public.claim_and_submit_task(
  p_candidate_task_id uuid,
  p_design_name text,
  p_steps text[]
)
returns public.task_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vendor_id uuid;
  v_task public.candidate_tasks;
  v_submission public.task_submissions;
  v_step text;
  v_position integer := 0;
begin
  v_vendor_id := public.current_vendor_id();
  if v_vendor_id is null then
    raise exception 'Only active vendors can submit tasks' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_design_name, ''))) < 3 then
    raise exception 'Design name must contain at least 3 characters' using errcode = '22023';
  end if;
  if coalesce(array_length(p_steps, 1), 0) < 1 or array_length(p_steps, 1) > 100 then
    raise exception 'A submission requires between 1 and 100 steps' using errcode = '22023';
  end if;

  select * into v_task
  from public.candidate_tasks
  where id = p_candidate_task_id
  for update;

  if not found or v_task.status <> 'published' then
    raise exception 'Candidate task is not available' using errcode = 'P0002';
  end if;
  if v_task.approved_count + v_task.pending_count >= v_task.target_count then
    raise exception 'Candidate task has no remaining capacity' using errcode = '23514';
  end if;

  insert into public.task_submissions (
    submission_code, candidate_task_id, vendor_id, design_name
  )
  values (
    'SUB-' || lpad(nextval('public.submission_code_seq')::text, 4, '0'),
    p_candidate_task_id,
    v_vendor_id,
    btrim(p_design_name)
  )
  returning * into v_submission;

  foreach v_step in array p_steps loop
    v_position := v_position + 1;
    if length(btrim(coalesce(v_step, ''))) < 2 then
      raise exception 'Submission steps cannot be blank' using errcode = '22023';
    end if;
    insert into public.submission_steps (submission_id, position, instruction)
    values (v_submission.id, v_position, btrim(v_step));
  end loop;

  return v_submission;
end;
$$;

revoke all on function public.claim_and_submit_task(uuid, text, text[]) from public;
grant execute on function public.claim_and_submit_task(uuid, text, text[]) to authenticated;

create or replace function public.review_submission(
  p_submission_id uuid,
  p_decision public.review_decision,
  p_feedback text default null
)
returns public.task_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission public.task_submissions;
  v_new_status public.submission_status;
begin
  if not public.is_admin() then
    raise exception 'Only admins can review submissions' using errcode = '42501';
  end if;

  select * into v_submission
  from public.task_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;
  if v_submission.status <> 'pending' then
    raise exception 'Only pending submissions can be reviewed' using errcode = '55000';
  end if;
  if p_decision <> 'approved' and length(btrim(coalesce(p_feedback, ''))) < 5 then
    raise exception 'Feedback is required for this decision' using errcode = '22023';
  end if;

  perform 1
  from public.candidate_tasks
  where id = v_submission.candidate_task_id
  for update;

  v_new_status := p_decision::text::public.submission_status;

  insert into public.review_records (
    submission_id, reviewer_id, prior_status, decision, feedback
  )
  values (
    p_submission_id, (select auth.uid()), v_submission.status, p_decision,
    nullif(btrim(p_feedback), '')
  );

  update public.task_submissions
  set status = v_new_status, reviewed_at = now()
  where id = p_submission_id
  returning * into v_submission;

  return v_submission;
end;
$$;

revoke all on function public.review_submission(uuid, public.review_decision, text) from public;
grant execute on function public.review_submission(uuid, public.review_decision, text) to authenticated;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_new jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  v_id text := coalesce(v_new ->> 'id', v_old ->> 'id');
begin
  insert into public.audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
  values ((select auth.uid()), lower(tg_op), tg_table_name, v_id, v_old, v_new);
  return coalesce(new, old);
end;
$$;

create trigger vendors_audit after insert or update or delete on public.vendors
for each row execute function public.write_audit_log();
create trigger candidate_tasks_audit after insert or update or delete on public.candidate_tasks
for each row execute function public.write_audit_log();
create trigger task_submissions_audit after insert or update or delete on public.task_submissions
for each row execute function public.write_audit_log();
create trigger review_records_audit after insert or update or delete on public.review_records
for each row execute function public.write_audit_log();
create trigger csv_imports_audit after insert or update or delete on public.csv_imports
for each row execute function public.write_audit_log();

alter table public.profiles enable row level security;
alter table public.vendors enable row level security;
alter table public.candidate_tasks enable row level security;
alter table public.task_submissions enable row level security;
alter table public.submission_steps enable row level security;
alter table public.review_records enable row level security;
alter table public.csv_imports enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_self_or_admin" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.is_admin());
create policy "profiles_admin_update" on public.profiles
for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "vendors_select_self_or_admin" on public.vendors
for select to authenticated
using (profile_id = (select auth.uid()) or public.is_admin());
create policy "vendors_admin_all" on public.vendors
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "tasks_read_published_or_admin" on public.candidate_tasks
for select to authenticated
using (
  public.is_admin()
  or (status = 'published' and public.current_vendor_id() is not null)
);
create policy "tasks_admin_all" on public.candidate_tasks
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "submissions_read_own_or_admin" on public.task_submissions
for select to authenticated
using (vendor_id = public.current_vendor_id() or public.is_admin());
create policy "submissions_admin_update" on public.task_submissions
for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "steps_read_own_or_admin" on public.submission_steps
for select to authenticated
using (
  exists (
    select 1 from public.task_submissions s
    where s.id = submission_id
      and (s.vendor_id = public.current_vendor_id() or public.is_admin())
  )
);

create policy "reviews_read_related_or_admin" on public.review_records
for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.task_submissions s
    where s.id = submission_id and s.vendor_id = public.current_vendor_id()
  )
);

create policy "csv_imports_admin_all" on public.csv_imports
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "audit_logs_admin_read" on public.audit_logs
for select to authenticated
using (public.is_admin());

revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;
grant insert (
  task_code, level_one_scene, level_two_scene, level_two_task, example_name,
  example_steps, target_count, status, created_by
) on public.candidate_tasks to authenticated;
grant update (
  task_code, level_one_scene, level_two_scene, level_two_task, example_name,
  example_steps, target_count, status
) on public.candidate_tasks to authenticated;
grant delete on public.candidate_tasks to authenticated;
grant insert, update, delete on public.csv_imports to authenticated;
grant usage on schema public to authenticated;
