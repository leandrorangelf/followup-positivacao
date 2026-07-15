const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('comment labels identify Fabiano and Vagner separately', () => {
  assert.match(html, /Comentario do Vagner/);
  assert.match(html, /Comentario do Fabiano/);
});

test('GNRE value button mentions GNRE explicitly', () => {
  assert.doesNotMatch(html, />Informar\/editar valor</);
  assert.match(html, />Informar\/editar GNRE</);
});
