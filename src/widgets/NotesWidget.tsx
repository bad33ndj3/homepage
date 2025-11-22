import { ChangeEvent } from 'react';
import { Card } from '../components/Card';
import { useLocalStorage } from '../hooks/useLocalStorage';

export function NotesWidget() {
  const [notes, setNotes] = useLocalStorage('homebase-notes', '');

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(event.target.value);
  };

  return (
    <Card title="Scratch Pad" subtitle="Tiny markdown-friendly notebook">
      <textarea
        value={notes}
        onChange={handleChange}
        placeholder="Drop quick notes, URLs or TODOs..."
        className="h-48 w-full rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-white outline-none focus:border-accent"
      />
    </Card>
  );
}
