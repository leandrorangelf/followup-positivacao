-- Preços aprovados Clean por cliente → clientes.def_skus (R$ por pacote, mesma unidade da ficha)
-- Gudang = GR + GM + GTWIN | Cretec = CM + CC | CLK = CK
-- Rodar no SQL Editor do Supabase. É idempotente (pode rodar de novo).
-- O resultado lista cada linha com quantos clientes foram atualizados (0 = nome não encontrado).
-- Só mexe nos 6 preços de def_skus; não altera ativo, coordenador nem pedidos já lançados.
-- coord: primeira palavra do coordenador no sistema (igor, vitor, rosana, junior); null = não filtra.
-- O nome tem que ser igual ao do banco (sem diferença de acento, caixa ou espaços).

with raw(nome, coord, gud, cre, clk) as (values
  ('AMAZON DISTRIBUIDORA','vitor',200,165,102),
  ('ARAUJO & OLIVEIRA TAB LTDA','vitor',200,165,102),
  ('BE ROYAL','rosana',200,165,102),
  ('BENTES OLIVEIRA COMERCIO','vitor',210,170,102),
  ('BM TAB - BAURU','igor',195,155,102),
  ('BM TAB - RIBEIRÃO','igor',195,155,102),
  ('BM TAB - SJC','igor',195,155,102),
  ('BM TAB - SUMARE','igor',195,155,102),
  ('BRASIL TABACOS','vitor',205,165,102),
  ('BRASUR COMERCIO DE ALIMENTOS','rosana',200,155,102),
  ('BROVALE','rosana',195,165,102),
  ('CERENA PINTO SOUTO MAIOR','vitor',205,155,102),
  ('COM ATAC DE CIG SOUZA - MRT','igor',205,165,102),
  ('CONCEITO - PE',null,200,165,102),
  ('CONCEITO AL',null,200,165,102),
  ('DMC DISTRIBUIDORA MINEIRA DE CIGARROS','igor',200,165,102),
  ('DUE VALLE','rosana',200,155,102),
  ('EDILON DE SOUZA CARVALHO',null,210,165,105),
  ('EDIVANES','igor',205,165,102),
  ('EL PRIME - MR DISTRIBUIDORA','igor',170,155,102),
  ('EURO TAB','vitor',210,170,102),
  ('EURO TABAGYN GO','vitor',210,170,102),
  ('FREEDOM TECH LTDA','rosana',210,175,102),
  ('NEW BLUETEX CE',null,130,110,102),   -- planilha: NB CE
  ('NEW BLUETEX MA',null,130,110,102),   -- planilha: NB MA
  ('NEW BLUETEX SP',null,130,110,102),   -- planilha: NB SP
  ('GUIMARAES CANDIDO MG','igor',190,155,102),
  ('J IZIDORIO','vitor',200,165,102),
  ('LM ROCHA',null,200,155,102),         -- planilha: LM DISTRIBUIDORA (RJ) — conferir se é o mesmo cliente
  ('JC DISTRIBUIDORA','igor',200,155,102),
  ('JK','igor',205,165,102),
  ('JOAO PEDRO','igor',220,165,102),
  ('JOSE GRIJALVO DA SILVA MOREIRA','vitor',210,170,102),
  ('L & L','vitor',200,155,102),
  ('LA DIST','igor',205,165,102),
  ('LEGAL DRINK',null,195,165,102),
  ('LH SANTOS','rosana',195,165,102),
  ('MARINGA COMERCIO E REPRESENTAÇOES LTDA','vitor',205,155,102),
  ('MARTA MG ( ANTIGO PEDRO HENRIQUE )','igor',205,165,102),
  ('MAXWEL SILVA BARBORSA / EMPORIO DO TABACO','igor',205,165,102),
  ('MG PRESENTES - 25 DE MARCO - MARIA','igor',200,155,102),
  ('MP COMERCIO','rosana',220,165,102),
  ('MUCCI DISTRIBUIDORA','vitor',205,155,102),
  ('NEW BLUETEX AM',null,130,110,102),   -- planilha trazia Cretec 155; corrigido: todos os New Bluetex têm o mesmo preço (130/110/102)
  ('NEW BLUETEX MG',null,130,110,102),
  ('NOVA IDEAL','igor',205,165,102),
  ('PANTELAO -PB',null,200,165,102),
  ('PORTO SEGURO MG','igor',205,165,102),
  ('REGIONAL DISTRIBUIDORA','igor',205,165,102),
  ('RJ FORTALEZA',null,198,155,102),
  ('RJ CARIRI',null,198,155,102),       -- planilha: RJ JUAZEIRO
  ('RJ QUIXADA',null,198,155,102),
  ('RJ SAO LUIS',null,198,155,102),
  ('RJ SOBRAL',null,198,155,102),
  ('SOUSA & SOUSA','vitor',205,170,102),
  ('TAB LM - PORTO VELHO','vitor',203,155,102),
  ('TABANORTE','vitor',203,166,102),
  ('WINS DISTRIBUIDORA ( Mauricinho )','igor',200,155,102),
  ('ZRIOS GOIAS','vitor',200,155,102)
),
p as (
  select row_number() over () as idx, raw.*,
    regexp_replace(regexp_replace(trim(translate(upper(nome),'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ','AAAAAEEEEIIIIOOOOOUUUUC')),'\s+',' ','g'),'\s*-\s*','-','g') as n
  from raw
),
alvo as (
  select c.id, p.idx, p.gud, p.cre, p.clk
  from clientes c
  join p on regexp_replace(regexp_replace(trim(translate(upper(c.nome),'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ','AAAAAEEEEIIIIOOOOOUUUUC')),'\s+',' ','g'),'\s*-\s*','-','g') = p.n
        and (p.coord is null or lower(c.coordenador) like p.coord || '%')
),
upd as (
  update clientes c
     set def_skus = coalesce(c.def_skus::jsonb, '{}'::jsonb) || jsonb_build_object(
           'GR', a.gud, 'GM', a.gud, 'GTWIN', a.gud,
           'CM', a.cre, 'CC', a.cre,
           'CK',  a.clk)
    from alvo a
   where c.id = a.id
  returning a.idx
)
select p.idx, p.nome, p.coord, p.gud, p.cre, p.clk,
       (select count(*) from upd u where u.idx = p.idx) as clientes_atualizados
from p
order by (select count(*) from upd u where u.idx = p.idx), p.idx;
