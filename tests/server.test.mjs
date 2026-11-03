import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';

// A real HTTP test of the shipped static server. No media is ever posted.
test('Static server: page, module MIME, byte range, security headers and no upload endpoint', async t => {
  const reservation = net.createServer();
  reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, ['scripts/serve.mjs'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: {...process.env, PORT: String(port)}, stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => child.kill());
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timed out')), 5000);
    child.once('error', reject);
    child.once('exit', code => {clearTimeout(timer); reject(new Error(`Server exited: ${code}`));});
    child.stdout.on('data', chunk => {if (String(chunk).includes('ECHOTRACE')) {clearTimeout(timer); resolve();}});
  });
  const base = `http://127.0.0.1:${port}`;
  const index = await fetch(base); assert.equal(index.status, 200);
  assert.equal(index.headers.get('x-content-type-options'), 'nosniff');
  assert.match(index.headers.get('permissions-policy'), /microphone=\(\)/);
  assert.match(await index.text(), /Content-Security-Policy/);
  const module = await fetch(`${base}/js/app.js`); assert.equal(module.status, 200);
  assert.match(module.headers.get('content-type'), /text\/javascript/);
  const video = await fetch(`${base}/assets/demo.mp4`, {headers: {Range: 'bytes=0-99'}});
  assert.equal(video.status, 206); assert.equal((await video.arrayBuffer()).byteLength, 100);
  const head = await fetch(`${base}/assets/demo.mp4`, {method: 'HEAD'}); assert.equal(head.status, 200);
  assert(Number(head.headers.get('content-length')) > 100000); assert.equal((await head.text()).length, 0);
  const post = await fetch(base, {method: 'POST', body: 'not a media file'}); assert.equal(post.status, 405);
  assert.equal((await fetch(`${base}/missing-file`)).status, 404);
  assert.equal((await fetch(`${base}/%2e%2e%2fpackage.json`)).status, 403);
});
