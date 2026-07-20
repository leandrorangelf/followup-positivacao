const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const mainStyle = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';

const screens = [
  'registro', 'tv', 'login', 'gestao', 'planilha', 'dash', 'ped', 'cli',
  'metas', 'premiacao', 'vendas', 'vfn', 'vficha', 'forecast', 'log',
  'relatorios'
];

test('keeps every application screen in the visual-system scope', () => {
  for (const screen of screens) assert.match(html, new RegExp(`id=["']s-${screen}["']`));
});

test('defines one canonical token system with compatible aliases', () => {
  assert.equal((mainStyle.match(/:root\s*\{/g) || []).length, 1);
  for (const token of ['--bg:#f3f5fa', '--card:#ffffff', '--border:#dce2ee',
    '--text:#172136', '--accent:#6547d9', '--r-sm:8px', '--r-md:12px',
    '--r-lg:18px', '--r-pill:999px', '--shadow-sm:', '--shadow-lg:', '--focus-ring:']) {
    assert.match(html, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('removes the obsolete dashboard header and duplicate render chain', () => {
  assert.doesNotMatch(html, /id=["']dash-(?:greeting|name|mes)["']/);
  assert.equal((html.match(/renderCoordDash\s*=\s*function|function\s+renderCoordDash/g) || []).length, 1);
  assert.equal((html.match(/renderAdminDash\s*=\s*function|function\s+renderAdminDash/g) || []).length, 1);
  assert.doesNotMatch(html, /function\s+(?:renderPremiacao|renderAdminPrem|calcPremiacao)\s*\(/);
});

test('uses design tokens instead of the legacy visual palette', () => {
  for (const literal of ['#5b6472', '#E2E0D8', '#F5F4F0', '#FAFAF8', '#2563EB', '#2563eb', '#1D4ED8']) {
    assert.doesNotMatch(html, new RegExp(literal, 'g'), `legacy literal ${literal} remains`);
  }
  assert.doesNotMatch(html, /font-size:(?:8|9|10)px/);
});

test('reserves navy for structure and purple for primary actions', () => {
  for (const selector of ['btn-login', 'fab-primary', 'btn-add', 'admin-tab.active',
    'cli-coord-tab.active', 'vd-chip-new']) {
    const escaped = selector.replace('.', '\\.');
    assert.match(html, new RegExp(`\\.${escaped}\\{[^}]*background:var\\(--purple\\)`));
  }
});

test('keeps every inline script syntactically valid', () => {
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length > 0);
  for (const [, source] of scripts) assert.doesNotThrow(() => new Function(source));
});

test('keeps the shared screen navigation helper used by login and every module', () => {
  assert.match(html, /function show\(id\)\{/);
  assert.match(html, /classList\.toggle\('visible',id!==\'s-login\'\)/);
});

test('keeps the shared database helper used by all data-backed screens', () => {
  assert.match(html, /async function sb\(path,opts=\{\}\)\{/);
  assert.match(html, /path\.replace\('\/rest\/v1\/','\/api\/db\/'\)/);
  assert.match(html, /credentials:'same-origin'/);
});

test('contains mobile overflow guards for wide operational screens', () => {
  assert.match(mainStyle, /#s-registro\{overflow-x:hidden\}/);
  assert.match(mainStyle, /#s-log \.section-head,#s-relatorios \.section-head\{[^}]*flex-direction:column/);
  assert.match(mainStyle, /#s-relatorios \.section-head>div:last-child>div\{[^}]*overflow-x:auto/);
});
