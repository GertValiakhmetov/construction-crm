create function public.transition_task(
  p_task_id uuid,
  p_to_status public.task_status,
  p_comment text default null
) returns public.tasks
language plpgsql security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_role public.app_role;
  task public.tasks;
  previous_status public.task_status;
begin
  select role into actor_role from public.profiles where id = actor;

  -- Lock only a task visible to the caller. Concurrent transitions are
  -- checked against the latest committed status after the lock is acquired.
  select t.* into task from public.tasks as t
  where t.id = p_task_id and (
    actor_role = 'manager' or (actor_role = 'executor' and t.assignee_id = actor)
  ) for update;

  if not found then
    raise exception 'Task unavailable' using errcode = '42501';
  end if;

  previous_status := task.status;
  if p_to_status is null or not (
    (actor_role = 'executor' and (
      (previous_status in ('new', 'rework') and p_to_status = 'in_progress')
      or (previous_status = 'in_progress' and p_to_status = 'in_review')
    ))
    or (actor_role = 'manager' and previous_status = 'in_review'
        and p_to_status in ('accepted', 'rework'))
  ) then
    raise exception 'Invalid task transition' using errcode = '22023';
  end if;

  if p_to_status = 'rework' and coalesce(p_comment, '') !~ '[^[:space:]]' then
    raise exception 'Rework requires a comment' using errcode = '22023';
  end if;

  update public.tasks set status = p_to_status
    where id = p_task_id returning * into task;
  insert into public.task_status_history (task_id, changed_by, from_status, to_status, comment)
    values (p_task_id, actor, previous_status, p_to_status, p_comment);
  return task;
end;
$$;

revoke all on function public.transition_task(uuid, public.task_status, text)
  from public, anon, authenticated;
grant execute on function public.transition_task(uuid, public.task_status, text)
  to authenticated;
