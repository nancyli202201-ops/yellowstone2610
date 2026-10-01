import test from 'node:test';
import assert from 'node:assert/strict';
import guide from '../api/guide.mjs';

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }
  };
}

async function call(method, body, headers = { 'content-type': 'application/json' }) {
  const res = response();
  await guide({ method, body, headers }, res);
  return res;
}

test('GET reports when the guide has not been configured', async () => {
  delete process.env.DEEPSEEK_API_KEY;
  const result = await call('GET');
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { ready: false });
  assert.equal(result.headers['cache-control'], 'no-store');
});

test('POST does not call DeepSeek without a server-side key', async () => {
  delete process.env.DEEPSEEK_API_KEY;
  const result = await call('POST', { message: 'What is Old Faithful?' });
  assert.equal(result.statusCode, 503);
  assert.match(result.body.error, /not configured/i);
});

test('POST rejects empty and oversized questions before calling DeepSeek', async () => {
  process.env.DEEPSEEK_API_KEY = 'test-key';
  const empty = await call('POST', { message: '   ' });
  const long = await call('POST', { message: 'a'.repeat(501) });
  assert.equal(empty.statusCode, 400);
  assert.equal(long.statusCode, 400);
  delete process.env.DEEPSEEK_API_KEY;
});

test('a Yellowstone answer reaches DeepSeek through the server, with the key hidden from output', async () => {
  process.env.DEEPSEEK_API_KEY = 'test-key';
  let outgoing;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    outgoing = { url, options };
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ scope: 'yellowstone', answer: 'Fountain Paint Pot Trail has mudpots, springs, vents, and geysers.' }) } }] }) };
  };
  try {
    const result = await call('POST', { message: 'What can I see here?', placeId: 'fountain' });
    assert.equal(result.statusCode, 200);
    assert.match(result.body.answer, /Fountain Paint Pot Trail/);
    assert.equal(outgoing.url, 'https://api.deepseek.com/chat/completions');
    assert.equal(outgoing.options.headers.Authorization, 'Bearer test-key');
    assert.match(JSON.stringify(JSON.parse(outgoing.options.body)), /Fountain Paint Pot Trail/);
    assert.doesNotMatch(JSON.stringify(result.body), /test-key/);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DEEPSEEK_API_KEY;
  }
});

test('off-topic output receives the fixed Yellowstone redirect', async () => {
  process.env.DEEPSEEK_API_KEY = 'test-key';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ scope: 'off_topic', answer: 'This answer should not be shown.' }) } }] }) });
  try {
    const result = await call('POST', { message: 'Write Python code' });
    assert.equal(result.statusCode, 200);
    assert.match(result.body.answer, /Yellowstone/i);
    assert.doesNotMatch(result.body.answer, /Python|should not/);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DEEPSEEK_API_KEY;
  }
});

test('provider failures show a safe, retryable error', async () => {
  process.env.DEEPSEEK_API_KEY = 'test-key';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 429 });
  try {
    const result = await call('POST', { message: 'Tell me about bison' });
    assert.equal(result.statusCode, 503);
    assert.match(result.body.error, /try again/i);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DEEPSEEK_API_KEY;
  }
});
