import { SearchBar } from './widgets/SearchBar';
import { LinkTiles } from './widgets/LinkTiles';
import { StatusBoard } from './widgets/StatusBoard';
import { NotesWidget } from './widgets/NotesWidget';
import { FocusTimer } from './widgets/FocusTimer';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-accent">Homebase</p>
          <h1 className="text-4xl font-bold text-white">Instant personal dashboard</h1>
          <p className="text-lg text-slate-300">
            React + Vite static homepage with GitLab/Jira peeks, quick links, and handy widgets.
          </p>
        </header>

        <SearchBar />
        <StatusBoard />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <LinkTiles />
            <NotesWidget />
          </div>
          <FocusTimer />
        </div>
      </div>
    </div>
  );
}

export default App;
