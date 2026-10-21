import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { addNote, getNote, listNotes, deleteNote, resetNotes } from '../src/notes.js';

beforeEach(() => resetNotes());

test('addNote stores a trimmed title', () => {
  const n = addNote('  Groceries ');
  assert.equal(n.title, 'Groceries');
  assert.deepEqual(getNote(n.id), n);
});

test('addNote rejects an empty title', () => {
  assert.throws(() => addNote('   '), /title is required/);
});

test('listNotes returns newest first', () => {
  addNote('a');
  addNote('b');
  assert.deepEqual(listNotes().map((n) => n.title), ['b', 'a']);
});

test('deleteNote removes a note', () => {
  const n = addNote('x');
  assert.equal(deleteNote(n.id), true);
  assert.equal(getNote(n.id), null);
});
