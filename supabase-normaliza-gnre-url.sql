update public.pedidos_vendas
set gnre_arquivo_url = regexp_replace(gnre_arquivo_url, '^.*/storage/v1/object/public/gnre-comprovantes/', '')
where gnre_arquivo_url like 'http%';

update public.pedidos_vendas
set gnre_comprovante_url = regexp_replace(gnre_comprovante_url, '^.*/storage/v1/object/public/gnre-comprovantes/', '')
where gnre_comprovante_url like 'http%';
