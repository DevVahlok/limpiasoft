-- handle_new_user() es solo para el trigger de auth.users; no debe ser invocable vía RPC pública.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
