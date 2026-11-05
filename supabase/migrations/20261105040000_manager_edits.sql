grant update (name, address), delete on public.objects to authenticated;
grant update (title, description, object_id, assignee_id), delete on public.tasks to authenticated;

create policy edit_objects on public.objects for update to authenticated
using ((select private.is_crm_manager()))
with check ((select private.is_crm_manager()));

create policy edit_tasks on public.tasks for update to authenticated
using ((select private.is_crm_manager()))
with check ((select private.is_crm_manager()) and exists (
  select 1 from public.profiles as p where p.id = tasks.assignee_id and p.role = 'executor'
));

create policy delete_objects on public.objects for delete to authenticated
using ((select private.is_crm_manager()));

create policy delete_tasks on public.tasks for delete to authenticated
using ((select private.is_crm_manager()));
