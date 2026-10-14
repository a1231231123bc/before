import assert from 'node:assert/strict';
import { test } from 'node:test';
import { beforeFraction, parseVideoMessage, videoFilename, VIDEO } from '../src/video/spec';

test('video has before/after holds, a reversible reveal, and matching loop endpoints', () => {
  assert.equal(VIDEO.frames / VIDEO.fps, 6);
  for (const t of [0, 0.5, 1, 6]) assert.equal(beforeFraction(t), 1);
  for (const t of [3, 3.5, 4]) assert.equal(beforeFraction(t), 0);
  assert.equal(beforeFraction(2), 0.5);
  assert.equal(beforeFraction(5), 0.5);
  assert.ok(beforeFraction(1.5) > beforeFraction(2.5));
  assert.ok(beforeFraction(4.5) < beforeFraction(5.5));
});

test('export filenames keep Unicode titles and cannot escape the export directory', () => {
  assert.equal(videoFilename('../Мой сад / 🪴'), 'Мой-сад-progress.mp4');
  assert.equal(videoFilename('...'), 'before-progress.mp4');
  assert.ok(videoFilename('a'.repeat(200)).length < 100);
});

test('renderer messages reject malformed results and clamp progress', () => {
  assert.equal(parseVideoMessage('not json'), null);
  assert.equal(parseVideoMessage('{"type":"done","base64":"<script>"}'), null);
  assert.deepEqual(parseVideoMessage('{"type":"progress","progress":2}'), {
    type: 'progress',
    progress: 1,
  });
});
