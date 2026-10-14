import { Journal, parseJournal } from './domain';

// IndexedDB keeps browser photos out of localStorage's small storage quota.
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('before-journal', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('journal');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other Before tabs and try again.'));
  });
}

export async function loadJournal(): Promise<Journal> {
  const db = await openDatabase();
  try {
    const raw = await new Promise<string | null>((resolve, reject) => {
      const transaction = db.transaction('journal', 'readonly');
      const request = transaction.objectStore('journal').get('v1');
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    return parseJournal(raw);
  } finally {
    db.close();
  }
}

export async function saveJournal(journal: Journal): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('journal', 'readwrite');
      transaction.objectStore('journal').put(JSON.stringify(journal), 'v1');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('The save was interrupted.'));
    });
  } finally {
    db.close();
  }
}
