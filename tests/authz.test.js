const test = require('node:test');
const assert = require('node:assert/strict');

const { podeCriarPedidoVenda, podeEditarPedidoVendaProprio } = require('../api/_lib/authz');
const { SENHAS_HASH } = require('../api/_lib/senhas');

// podeEditarPedidoVendaProprio consulta o Supabase pra checar dono/faturamento — mocka fetch.
function mockPedido({ coordenador, faturado }) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  global.fetch = async () => ({
    ok: true,
    text: async () => JSON.stringify([{ coordenador, pedidos_vendas_itens: [{ qty_faturada: faturado ? 5 : 0 }] }]),
  });
}

test('vagner can edit any coordenador pedido that is not yet faturado', async () => {
  mockPedido({ coordenador: 'Igor Cater', faturado: false });
  assert.equal(await podeEditarPedidoVendaProprio({ user: 'vagner' }, 'x'), true);
});

test('vagner cannot edit a pedido that already has faturamento', async () => {
  mockPedido({ coordenador: 'Igor Cater', faturado: true });
  assert.equal(await podeEditarPedidoVendaProprio({ user: 'vagner' }, 'x'), false);
});

test('coordenador still cannot edit another coordenador pedido', async () => {
  mockPedido({ coordenador: 'Igor Cater', faturado: false });
  assert.equal(await podeEditarPedidoVendaProprio({ user: 'Marcio Vit' }, 'x'), false);
});

test('vagner can create a new sales order', () => {
  assert.equal(podeCriarPedidoVenda({ user: 'vagner' }), true);
});

test('fabiano remains blocked from creating a new sales order', () => {
  assert.equal(podeCriarPedidoVenda({ user: 'fabiano' }), false);
});

test('admin password hash is the current rotated SHA-256 value', () => {
  assert.equal(SENHAS_HASH.admin, '56c498511ab3f4d1f9d637a798ead847cf8790ace1020c9048d5981be32d5673');
  assert.match(SENHAS_HASH.admin, /^[a-f0-9]{64}$/);
});
