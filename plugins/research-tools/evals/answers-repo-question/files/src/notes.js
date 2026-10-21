// In-memory note store. Notes are plain objects: { id, title, body, createdAt }.

let nextId = 1;
const notes = new Map();

export function addNote(title, body = '') {
  if (typeof title !== 'string' || title.trim() === '') throw new Error('title is required');
  const note = { id: nextId++, title: title.trim(), body, createdAt: new Date().toISOString() };
  notes.set(note.id, note);
  return note;
}

export function getNote(id) {
  return notes.get(id) ?? null;
}

export function listNotes() {
  return [...notes.values()].sort((a, b) => b.id - a.id);
}

export function deleteNote(id) {
  return notes.delete(id);
}

export function resetNotes() {
  notes.clear();
  nextId = 1;
}
