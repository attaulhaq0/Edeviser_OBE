revoke execute on function public.get_xp_balance(uuid) from public;
grant execute on function public.get_xp_balance(uuid) to authenticated, service_role;
