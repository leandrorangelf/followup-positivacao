const test = require('node:test');
const assert = require('node:assert/strict');

const { podeCriarPedidoVenda } = require('../api/_lib/authz');

test('vagner can create a new sales order', () => {
  assert.equal(podeCriarPedidoVenda({ user: 'vagner' }), true);
});

test('fabiano remains blocked from creating a new sales order', () => {
  assert.equal(podeCriarPedidoVenda({ user: 'fabiano' }), false);
});
