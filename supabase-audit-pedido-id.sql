alter table audit_log add column if not exists pedido_id uuid;
create index if not exists idx_audit_log_pedido_id on audit_log(pedido_id);
