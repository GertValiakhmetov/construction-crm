-- Keep the role lookup outside the exposed API schema. The definer reads a
-- single flag for the caller without recursively evaluating profiles policies.
create schema if not exists private;
revoke create on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create function private.is_crm_manager()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'manager'
  );
$$;

revoke all on function private.is_crm_manager() from public, anon, authenticated;
grant execute on function private.is_crm_manager() to authenticated;

grant select on public.profiles, public.objects, public.tasks,
  public.task_status_history to authenticated;

create policy read_profiles on public.profiles
for select to authenticated
using (id = (select auth.uid()) or (select private.is_crm_manager()));

create policy read_tasks on public.tasks
for select to authenticated
using (assignee_id = (select auth.uid()) or (select private.is_crm_manager()));

create policy read_objects on public.objects
for select to authenticated
using (
  (select private.is_crm_manager()) or exists (
    select 1 from public.tasks as t
    where t.object_id = objects.id and t.assignee_id = (select auth.uid())
  )
);

-- Task RLS also governs its entire history, including events by other people.
create policy read_task_history on public.task_status_history
for select to authenticated
using (exists (select 1 from public.tasks as t where t.id = task_status_history.task_id));
