select storage.create_bucket('payment_proofs', true);

-- Ejemplo de políticas para el bucket privado.
-- Ajustarlas según el rol real del backend o el servicio.
-- create policy "payment_proofs_admin_upload"
-- on storage.objects
-- for insert
-- with check (
--   bucket_id = 'payment_proofs'
--   and auth.jwt() ->> 'role' = 'service_role'
-- );
--
-- create policy "payment_proofs_admin_select"
-- on storage.objects
-- for select
-- using (
--   bucket_id = 'payment_proofs'
--   and auth.jwt() ->> 'role' = 'service_role'
-- );
