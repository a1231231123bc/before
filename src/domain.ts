export const CATEGORIES = ['Everyday', 'Plants', 'Home', 'Creative', 'Personal'] as const;
export type Category = (typeof CATEGORIES)[number];

export type Entry = {
  id: string;
  imageUri: string;
  date: string;
  note: string;
  createdAt: string;
};
export type Project = {
  id: string;
  title: string;
  category: Category;
  createdAt: string;
  entries: Entry[];
};
export type Journal = { version: 1; projects: Project[] };
export const EMPTY_JOURNAL: Journal = { version: 1, projects: [] };

export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function formatDate(value: string, year = false) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(year ? { year: 'numeric' as const } : {}),
  });
}

export function orderedEntries(project: Project): Entry[] {
  return [...project.entries].sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
  );
}

export function daySpan(entries: Entry[]) {
  if (entries.length < 2) return 0;
  const timestamps = entries.map((entry) => Date.parse(`${entry.date}T12:00:00Z`));
  return Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 86_400_000);
}

export function parseJournal(raw: string | null): Journal {
  if (raw === null) return { version: 1, projects: [] };
  const data: unknown = JSON.parse(raw);
  if (
    !data ||
    typeof data !== 'object' ||
    !('version' in data) ||
    data.version !== 1 ||
    !('projects' in data) ||
    !Array.isArray(data.projects)
  )
    throw new Error('Unsupported journal format. Your saved data has not been changed.');
  const projectIds = new Set<string>();
  for (const p of data.projects) {
    if (
      !p ||
      typeof p.id !== 'string' ||
      !p.id ||
      projectIds.has(p.id) ||
      typeof p.title !== 'string' ||
      !p.title.trim() ||
      !CATEGORIES.includes(p.category) ||
      typeof p.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(p.createdAt)) ||
      !Array.isArray(p.entries)
    )
      throw new Error('This journal could not be read. Your saved data has not been changed.');
    projectIds.add(p.id);
    const entryIds = new Set<string>();
    for (const e of p.entries) {
      if (
        !e ||
        typeof e.id !== 'string' ||
        !e.id ||
        entryIds.has(e.id) ||
        typeof e.imageUri !== 'string' ||
        !e.imageUri ||
        typeof e.note !== 'string' ||
        typeof e.createdAt !== 'string' ||
        !Number.isFinite(Date.parse(e.createdAt)) ||
        typeof e.date !== 'string' ||
        !isValidDate(e.date)
      )
        throw new Error('A saved moment could not be read. Your saved data has not been changed.');
      entryIds.add(e.id);
    }
  }
  return data as Journal;
}

export const SAMPLE_PROJECT: Project = {
  id: 'sample',
  title: 'A little greener',
  category: 'Plants',
  createdAt: '2026-09-01T12:00:00Z',
  entries: [
    {
      id: 'sample-before',
      imageUri: 'sample:white',
      date: '2026-09-01',
      note: 'A quiet corner, a fresh beginning.',
      createdAt: '2026-09-01T12:00:00Z',
    },
    {
      id: 'sample-after',
      imageUri: 'sample:terracotta',
      date: '2026-10-14',
      note: 'A little more green. A little more warmth.',
      createdAt: '2026-10-14T12:00:00Z',
    },
  ],
};
