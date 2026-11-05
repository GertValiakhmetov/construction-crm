grant insert (name, address) on public.objects to authenticated;

create policy create_objects on public.objects
for insert to authenticated
with check ((select private.is_crm_manager()));

-- Column grants let clients supply only the task's business fields.
alter table public.tasks alter column created_by set default auth.uid();
grant insert (object_id, title, description, assignee_id)
  on public.tasks to authenticated;

create policy create_tasks on public.tasks
for insert to authenticated
with check (
  (select private.is_crm_manager())
  and created_by = (select auth.uid())
  and status = 'new'
  and exists (
    select 1 from public.profiles as p
    where p.id = tasks.assignee_id and p.role = 'executor'
  )
);

create function private.record_task_creation()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.task_status_history (task_id, changed_by, to_status, changed_at)
  values (new.id, new.created_by, new.status, new.created_at);
  return new;
end;
$$;

revoke all on function private.record_task_creation() from public, anon, authenticated;

create trigger record_task_creation
after insert on public.tasks
for each row execute function private.record_task_creation();
