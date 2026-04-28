'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../lib/codegen');

test('render: simple interpolation', () => {
  assert.equal(render('hello {{ name }}', { name: 'world' }), 'hello world');
});

test('render: nested key lookup', () => {
  assert.equal(render('{{ user.name }}', { user: { name: 'a' } }), 'a');
});

test('render: missing key becomes empty', () => {
  assert.equal(render('hello {{ missing }}', {}), 'hello ');
});

test('render: helper application', () => {
  assert.equal(render('{{ name | upper }}', { name: 'foo' }), 'FOO');
  assert.equal(render('{{ name | lower }}', { name: 'BAR' }), 'bar');
});

test('render: jsstr escapes single quotes and newlines', () => {
  assert.equal(render("'{{ s | jsstr }}'", { s: "it's\nfine" }), "'it\\'s\\nfine'");
});

test('render: htmlattr escapes dangerous chars', () => {
  assert.equal(render('"{{ x | htmlattr }}"', { x: '"a"&<' }), '"&quot;a&quot;&amp;&lt;"');
});

test('render: unknown helper throws', () => {
  assert.throws(() => render('{{ x | nope }}', { x: 1 }));
});

test('render: does NOT execute code in keys', () => {
  // template injection attempt
  const out = render('{{ name }}', { name: '${process.env.HOME}' });
  // value is inserted literally, not evaluated
  assert.equal(out, '${process.env.HOME}');
});

test('render: rejects non-string template', () => {
  assert.throws(() => render(null, {}));
  assert.throws(() => render(123, {}));
});

test('render: jsonp serializes deeply', () => {
  const out = render('{{ data | jsonp }}', { data: { a: 1, b: [2, 3] } });
  assert.match(out, /"a": 1/);
  assert.match(out, /"b": \[\n/);
});
