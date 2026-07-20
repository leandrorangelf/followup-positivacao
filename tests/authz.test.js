const test = require('node:test');
const assert = require('node:assert/strict');

const { podeCriarPedidoVenda } = require('../api/_lib/authz');
const { SENHAS_HASH } = require('../api/_lib/senhas');

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
