create extension if not exists pg_trgm with schema extensions;

create index if not exists candidate_tasks_example_name_trgm_idx
on public.candidate_tasks
using gin (example_name extensions.gin_trgm_ops);

create index if not exists candidate_tasks_level_one_scene_sort_idx
on public.candidate_tasks (level_one_scene, level_two_scene, task_code);

create index if not exists candidate_tasks_counts_sort_idx
on public.candidate_tasks (target_count desc, available_count desc);

create or replace function public.get_task_filter_options()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_scenes jsonb;
  v_tasks jsonb;
begin
  select coalesce(jsonb_agg(scene order by scene), '[]'::jsonb)
  into v_scenes
  from (
    select distinct level_one_scene as scene
    from public.candidate_tasks
  ) options;

  select coalesce(jsonb_agg(task order by task), '[]'::jsonb)
  into v_tasks
  from (
    select distinct level_two_task as task
    from public.candidate_tasks
  ) options;

  return jsonb_build_object('scenes', v_scenes, 'tasks', v_tasks);
end;
$$;

revoke all on function public.get_task_filter_options() from public;
grant execute on function public.get_task_filter_options() to authenticated;
