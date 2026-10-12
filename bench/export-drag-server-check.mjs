// Run with node --test bench/export-drag-server-check.mjs; keep separate from Vitest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dragTestServer } from './export-drag-server.mjs';

test('missing, malformed and escaping requests leave the fixture server alive', async () => {
  const server = dragTestServer();
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [path, status] of [
      ['/fixtures/not-present.png', 404],
      ['/fixtures/%zz', 400],
      ['/fixtures/%2e%2e%2fdist/index.html', 403],
      ['/favicon-not-present.ico', 404],
    ]) {
      const response = await fetch(origin + path);
      assert.equal(response.status, status);
      await response.arrayBuffer();
      const page = await fetch(origin + '/');
      assert.equal(page.status, 200);
      assert.match(page.headers.get('content-type'), /text\/html/);
      assert.match(await page.text(), /Bitify/);
    }
  } finally {
    server.closeAllConnections();
    await new Promise(done => server.close(done));
  }
});
