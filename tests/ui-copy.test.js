const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('comment labels identify Fabiano and Vagner separately', () => {
  assert.match(html, /Comentario do Vagner/);
  assert.match(html, /Comentario do Fabiano/);
});

test('fiscal status is represented only by the orange dot', () => {
  assert.match(html, /class="dot-status dot-off"/);
  assert.match(html, /<th[^>]*>Status<\/th>/);
  const visibleMarkup = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  assert.doesNotMatch(visibleMarkup, />[^<]*\bOFF\b[^<]*</i);
  assert.doesNotMatch(html, /sem\s*nf/i);
});

test('pedido PDF does not export the internal fiscal type label', () => {
  const pedidoPdf = html.slice(html.indexOf('function vdExportarPedidoPDF'), html.indexOf('function vdPodeComentarPedido'));
  assert.doesNotMatch(pedidoPdf, /String\(p\.tipo\|\|'in'\)\.toUpperCase\(\)/);
  assert.match(pedidoPdf, /\['Status',''\]/);
  assert.match(pedidoPdf, /didDrawCell/);
});

test('GNRE value button mentions GNRE explicitly', () => {
  assert.doesNotMatch(html, />Informar\/editar valor</);
  assert.match(html, />Informar\/editar GNRE</);
});
