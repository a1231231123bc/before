import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { EMPTY_JOURNAL, type Journal } from './domain';
import { loadJournal } from './storage';

function useJournalState() {
  const [journal, setJournal] = useState<Journal>(EMPTY_JOURNAL);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const read = useCallback(
    () =>
      loadJournal().then(
        (saved) => {
          setJournal(saved);
          setReady(true);
        },
        (error: unknown) => {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Your journal could not be opened. Please try again.',
          );
        },
      ),
    [],
  );
  useEffect(() => {
    void read();
  }, [read]);
  return { journal, setJournal, ready, loadError, read };
}
const JournalContext = createContext<ReturnType<typeof useJournalState> | null>(null);
export function JournalProvider({ children }: { children: React.ReactNode }) {
  const value = useJournalState();
  return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
}
export function useJournal() {
  const context = useContext(JournalContext);
  if (!context) throw new Error('JournalProvider is missing.');
  return context;
}
