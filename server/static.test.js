import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createApp } from './app.js';

test('legal documents serve on direct and directory URLs instead of falling back to the home page', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'goodspeed-static-'));
  const documents = ['privacy-policy', 'terms-and-conditions', 'cookies', 'property-disclaimer'];
  writeFileSync(join(directory, 'index.html'), '<h1>Home page</h1>');
  for (const document of documents) {
    mkdirSync(join(directory, document));
    writeFileSync(join(directory, document, 'index.html'), `<h1>${document}</h1>`);
  }
  const app = createApp({ staticDirectory: directory, store: { create() { throw new Error('No enquiry should be saved'); } } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  context.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  });
  for (const document of documents) {
    for (const path of [`/${document}`, `/${document}/`, `/${document}/index.html`]) {
      const response = await fetch(`${baseUrl}${path}`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /text\/html/);
      assert.equal(await response.text(), `<h1>${document}</h1>`);
    }
    const head = await fetch(`${baseUrl}/${document}/`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
  }
  const invalid = await fetch(`${baseUrl}/api/enquiries`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.equal(invalid.status, 422);
  assert.match(invalid.headers.get('content-type'), /application\/json/);
  const home = await fetch(baseUrl);
  assert.equal(await home.text(), '<h1>Home page</h1>');
});
