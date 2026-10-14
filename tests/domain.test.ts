import assert from 'node:assert/strict';
import test from 'node:test';
import { SAMPLE_PROJECT, daySpan, isValidDate, orderedEntries, parseJournal } from '../src/domain';

test('rejects impossible dates and accepts leap days', () => {
  assert.equal(isValidDate('2024-02-29'), true);
  for (const date of [
    '2025-02-29',
    '2026-02-30',
    '2026-13-01',
    '2026-00-10',
    '2026-1-01',
    'not a date',
  ])
    assert.equal(isValidDate(date), false, date);
});
test('keeps chronological order without mutating the stored array', () => {
  const p = { ...SAMPLE_PROJECT, entries: [...SAMPLE_PROJECT.entries].reverse() };
  assert.equal(orderedEntries(p)[0].id, 'sample-before');
  assert.equal(p.entries[0].id, 'sample-after');
});
test('counts calendar days independently of daylight saving transitions', () => {
  const entries = SAMPLE_PROJECT.entries.map((e, i) => ({
    ...e,
    date: i ? '2026-03-09' : '2026-03-07',
  }));
  assert.equal(daySpan(entries), 2);
  assert.equal(daySpan([]), 0);
  assert.equal(daySpan([entries[0]]), 0);
});
test('reads a new journal and preserves existing notes and images', () => {
  assert.deepEqual(parseJournal(null), { version: 1, projects: [] });
  const journal = { version: 1, projects: [SAMPLE_PROJECT] };
  assert.deepEqual(parseJournal(JSON.stringify(journal)), journal);
});
test('refuses corrupted or future data instead of resetting the journal', () => {
  for (const raw of ['{', '{}', '{"version":2,"projects":[]}', '{"version":1,"projects":[null]}'])
    assert.throws(() => parseJournal(raw));
  assert.throws(() =>
    parseJournal(
      JSON.stringify({
        version: 1,
        projects: [
          { ...SAMPLE_PROJECT, entries: [{ ...SAMPLE_PROJECT.entries[0], date: '2026-02-30' }] },
        ],
      }),
    ),
  );
  assert.throws(() =>
    parseJournal(JSON.stringify({ version: 1, projects: [SAMPLE_PROJECT, SAMPLE_PROJECT] })),
  );
  assert.throws(() =>
    parseJournal(
      JSON.stringify({
        version: 1,
        projects: [
          { ...SAMPLE_PROJECT, entries: [SAMPLE_PROJECT.entries[0], SAMPLE_PROJECT.entries[0]] },
        ],
      }),
    ),
  );
});
