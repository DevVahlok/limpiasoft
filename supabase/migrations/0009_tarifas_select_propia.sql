-- El empleado necesita ver su propia tarifa para calcular cuánto va a cobrar
-- ("Mi resumen mensual"), pero nunca la de sus compañeros.
create policy tarifas_select_propia on public.tarifas
  for select using (empleado_id = auth.uid());
