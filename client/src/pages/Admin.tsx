import { useState, useRef } from 'react';
import { Layout } from '../components/common/Layout';
import { Button } from '../components/common/Button';
import {
  useGetAdminTournamentsQuery,
  useGetTournamentCategoriesQuery,
  useGetMatchesQuery,
  useGetAdminResultsQuery,
  useGetTournamentOptionsQuery,
  useUpdateMatchMutation,
  useSetActualResultMutation,
  useSetTournamentStatusMutation,
  useCreateAdminTournamentMutation,
  useUpdateAdminTournamentMutation,
  useUpdateTournamentSquadsMutation,
  useCreateAdminMatchMutation,
  useBulkCreateMatchesMutation,
  useDeleteAdminMatchMutation,
} from '../store/api';
import type { Match, Category, Tournament } from '../types/index';

// ── CSV helpers ────────────────────────────────────────────────────────────────

const MATCH_CSV_HEADER = 'Match Number,Team A,Team B,Date (YYYY-MM-DD),Time (HH:MM 24h),Venue';
const SQUAD_CSV_HEADER = 'Team,Player';

const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const MATCH_SAMPLE = `${MATCH_CSV_HEADER}
1,Mumbai Indians,Chennai Super Kings,2025-03-22,19:30,Wankhede Stadium
2,Royal Challengers Bengaluru,Kolkata Knight Riders,2025-03-23,15:30,M Chinnaswamy Stadium
3,Delhi Capitals,Sunrisers Hyderabad,2025-03-24,19:30,Arun Jaitley Stadium`;

const SQUAD_SAMPLE = `${SQUAD_CSV_HEADER}
Mumbai Indians,Rohit Sharma
Mumbai Indians,Jasprit Bumrah
Mumbai Indians,Suryakumar Yadav
Chennai Super Kings,Ruturaj Gaikwad
Chennai Super Kings,MS Dhoni
Chennai Super Kings,Ravindra Jadeja`;

function parseMatchCSV(text: string): { matchNumber: number; teamA: string; teamB: string; venue?: string; scheduledAt: string }[] {
  const lines = text.trim().split('\n').filter((l) => l.trim() && !l.toLowerCase().startsWith('match'));
  return lines.map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const [num, teamA, teamB, date, time, ...venueParts] = cols;
    const venue = venueParts.join(',').trim();
    const scheduledAt = new Date(`${date}T${time || '19:30'}:00`).toISOString();
    return { matchNumber: Number(num), teamA, teamB, scheduledAt, ...(venue ? { venue } : {}) };
  }).filter((m) => m.matchNumber && m.teamA && m.teamB);
}

function parseSquadCSV(text: string): Record<string, string[]> {
  const lines = text.trim().split('\n').filter((l) => l.trim() && !l.toLowerCase().startsWith('team'));
  const squads: Record<string, string[]> = {};
  for (const line of lines) {
    const idx = line.indexOf(',');
    if (idx === -1) continue;
    const team = line.slice(0, idx).trim();
    const player = line.slice(idx + 1).trim();
    if (team && player) {
      if (!squads[team]) squads[team] = [];
      squads[team].push(player);
    }
  }
  return squads;
}

// ── Searchable dropdown (shared) ───────────────────────────────────────────────

const SearchDropdown = ({
  options, value, onChange, placeholder, disabled,
}: {
  options: string[]; value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean;
}) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()) && o !== value);
  const select = (name: string) => { onChange(name); setSearch(''); setOpen(false); };

  return (
    <div className="relative">
      {value ? (
        <div className="flex items-center gap-2 bg-[#FF6800]/5 border border-[#FF6800]/25 rounded-lg px-3 py-2">
          <span className="text-gray-200 text-sm flex-1 truncate">{value}</span>
          {!disabled && (
            <button onClick={() => onChange('')} className="text-gray-500 hover:text-red-400 cursor-pointer shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 bg-[#111] border border-[#2F2F2F] focus-within:border-[#FF6800] rounded-lg px-3 py-2 transition-colors">
            <svg className="w-3.5 h-3.5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input ref={inputRef} value={search}
              onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder={placeholder ?? 'Search…'} disabled={disabled}
              className="bg-transparent text-white text-sm outline-none flex-1 placeholder-gray-600"
            />
          </div>
          {open && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1A1A] border border-[#2F2F2F] rounded-lg overflow-hidden z-20 shadow-2xl max-h-44 overflow-y-auto">
              {filtered.map((name) => (
                <button key={name} onMouseDown={() => select(name)}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-[#FF6800]/10 hover:text-white transition-colors cursor-pointer border-b border-[#2A2A2A] last:border-0">
                  {name}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Input helper ───────────────────────────────────────────────────────────────

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-gray-400 text-xs font-medium">{label}</label>
    {children}
  </div>
);

const textInputCls = "bg-[#111] border border-[#2F2F2F] focus:border-[#FF6800] rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors placeholder-gray-600";

// ── Tournament Form ─────────────────────────────────────────────────────────────

const TournamentForm = ({ existing, onDone }: { existing?: Tournament; onDone: () => void }) => {
  const [form, setForm] = useState({
    name: existing?.name ?? '',
    sport: existing?.sport ?? 'cricket',
    type: existing?.type ?? 'T20',
    season: existing?.season ?? new Date().getFullYear().toString(),
    totalMatches: existing?.totalMatches?.toString() ?? '74',
    startDate: existing?.startDate ? existing.startDate.slice(0, 10) : '',
    endDate: existing?.endDate ? existing.endDate.slice(0, 10) : '',
  });
  const [error, setError] = useState('');
  const [createTournament, { isLoading: creating }] = useCreateAdminTournamentMutation();
  const [updateTournament, { isLoading: updating }] = useUpdateAdminTournamentMutation();

  const isLoading = creating || updating;

  const handleSave = async () => {
    setError('');
    if (!form.name || !form.startDate || !form.endDate) { setError('Name, start date, and end date are required.'); return; }
    try {
      const body = { ...form, totalMatches: Number(form.totalMatches) };
      if (existing) {
        await updateTournament({ id: existing._id, body }).unwrap();
      } else {
        await createTournament(body).unwrap();
      }
      onDone();
    } catch {
      setError('Failed to save tournament.');
    }
  };

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="bg-[#1A1A1A] border border-[#2F2F2F] rounded-xl p-5 flex flex-col gap-4">
      <h3 className="text-white font-semibold">{existing ? 'Edit Tournament' : 'New Tournament'}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Tournament Name">
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. IPL 2025" className={`${textInputCls} sm:col-span-2`} />
        </Field>
        <Field label="Sport">
          <input value={form.sport} onChange={(e) => set('sport', e.target.value)} placeholder="cricket" className={textInputCls} />
        </Field>
        <Field label="Format / Type">
          <input value={form.type} onChange={(e) => set('type', e.target.value)} placeholder="T20" className={textInputCls} />
        </Field>
        <Field label="Season">
          <input value={form.season} onChange={(e) => set('season', e.target.value)} placeholder="2025" className={textInputCls} />
        </Field>
        <Field label="Total Matches">
          <input type="number" value={form.totalMatches} onChange={(e) => set('totalMatches', e.target.value)} className={textInputCls} />
        </Field>
        <Field label="Start Date">
          <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className={textInputCls} />
        </Field>
        <Field label="End Date">
          <input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className={textInputCls} />
        </Field>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onDone}>Cancel</Button>
        <Button loading={isLoading} onClick={handleSave}>{existing ? 'Save Changes' : 'Create Tournament'}</Button>
      </div>
    </div>
  );
};

// ── Squads Manager ─────────────────────────────────────────────────────────────

const SquadsManager = ({ tournament, allTournaments }: { tournament: Tournament; allTournaments: Tournament[] }) => {
  const [teams, setTeams] = useState<string[]>(tournament.teams ?? []);
  const [squads, setSquads] = useState<Record<string, string[]>>(tournament.squads ?? {});
  const [selectedTeam, setSelectedTeam] = useState('');
  const [newTeam, setNewTeam] = useState('');
  const [newPlayer, setNewPlayer] = useState('');
  const [csvError, setCsvError] = useState('');
  const [saved, setSaved] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFromId, setImportFromId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [updateSquads, { isLoading }] = useUpdateTournamentSquadsMutation();

  const otherTournaments = allTournaments.filter((t) => t._id !== tournament._id);

  const { data: importOptions, isFetching: importFetching } = useGetTournamentOptionsQuery(importFromId!, {
    skip: !importFromId,
  });

  const handleImportReplace = () => {
    if (!importOptions) return;
    setTeams(importOptions.teams);
    setSquads(importOptions.squads as Record<string, string[]>);
    setSelectedTeam('');
    setShowImport(false);
    setImportFromId('');
  };

  const handleImportMerge = () => {
    if (!importOptions) return;
    setTeams((prev) => Array.from(new Set([...prev, ...importOptions.teams])));
    setSquads((prev) => {
      const next = { ...prev };
      for (const [team, players] of Object.entries(importOptions.squads as Record<string, string[]>)) {
        next[team] = Array.from(new Set([...(next[team] ?? []), ...players]));
      }
      return next;
    });
    setShowImport(false);
    setImportFromId('');
  };

  const addTeam = () => {
    const t = newTeam.trim();
    if (!t || teams.includes(t)) return;
    setTeams((prev) => [...prev, t]);
    setSquads((prev) => ({ ...prev, [t]: [] }));
    setNewTeam('');
    setSelectedTeam(t);
  };

  const removeTeam = (t: string) => {
    setTeams((prev) => prev.filter((x) => x !== t));
    setSquads((prev) => { const n = { ...prev }; delete n[t]; return n; });
    if (selectedTeam === t) setSelectedTeam('');
  };

  const addPlayer = () => {
    const p = newPlayer.trim();
    if (!p || !selectedTeam) return;
    if ((squads[selectedTeam] ?? []).includes(p)) return;
    setSquads((prev) => ({ ...prev, [selectedTeam]: [...(prev[selectedTeam] ?? []), p] }));
    setNewPlayer('');
  };

  const removePlayer = (player: string) => {
    setSquads((prev) => ({ ...prev, [selectedTeam]: prev[selectedTeam].filter((p) => p !== player) }));
  };

  const handleSave = async () => {
    try {
      await updateSquads({ id: tournament._id, teams, squads }).unwrap();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
  };

  const handleSquadCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError('');
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseSquadCSV(ev.target?.result as string);
        const newTeams = Object.keys(parsed);
        setTeams((prev) => Array.from(new Set([...prev, ...newTeams])));
        setSquads((prev) => {
          const next = { ...prev };
          for (const [t, players] of Object.entries(parsed)) {
            next[t] = Array.from(new Set([...(next[t] ?? []), ...players]));
          }
          return next;
        });
      } catch { setCsvError('Failed to parse CSV. Check the format.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => downloadCSV(SQUAD_SAMPLE, 'squads_sample.csv')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2F2F2F] text-gray-400 text-xs hover:border-[#FF6800] hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Sample CSV
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2F2F2F] text-gray-400 text-xs hover:border-[#FF6800] hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
          </svg>
          Import CSV
        </button>
        {otherTournaments.length > 0 && (
          <button
            onClick={() => { setShowImport((v) => !v); setImportFromId(''); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
              showImport
                ? 'border-[#FF6800]/50 text-[#FF6800] bg-[#FF6800]/5'
                : 'border-[#2F2F2F] text-gray-400 hover:border-[#FF6800] hover:text-white'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Copy from Tournament
          </button>
        )}
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleSquadCSV} />
      </div>

      {/* Import from tournament panel */}
      {showImport && (
        <div className="bg-[#111] border border-[#FF6800]/20 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-gray-300 text-sm font-medium">Copy teams & squads from another tournament</p>

          <div className="flex flex-col gap-1.5">
            <label className="text-gray-500 text-xs">Source tournament</label>
            <select
              value={importFromId}
              onChange={(e) => setImportFromId(e.target.value)}
              className="bg-[#1A1A1A] border border-[#2F2F2F] focus:border-[#FF6800] rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
            >
              <option value="">Select a tournament…</option>
              {otherTournaments.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({(t.teams ?? []).length} teams)
                </option>
              ))}
            </select>
          </div>

          {importFromId && (
            importFetching ? (
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin" />
                Loading squads…
              </div>
            ) : importOptions ? (
              <div className="flex flex-col gap-3">
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-xs text-gray-400 flex flex-wrap gap-4">
                  <span>
                    <span className="text-white font-semibold">{importOptions.teams.length}</span> teams
                  </span>
                  <span>
                    <span className="text-white font-semibold">{importOptions.players.length}</span> players
                  </span>
                  <span className="text-gray-600">
                    {importOptions.teams.slice(0, 4).join(', ')}{importOptions.teams.length > 4 ? ` +${importOptions.teams.length - 4} more` : ''}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleImportReplace}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/40 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    Replace All
                    <span className="text-red-500/60 font-normal">(clears existing)</span>
                  </button>
                  <button
                    onClick={handleImportMerge}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#FF6800]/40 text-[#FF6800] text-xs font-medium hover:bg-[#FF6800]/10 transition-colors cursor-pointer"
                  >
                    Merge
                    <span className="text-[#FF6800]/60 font-normal">(keeps existing, adds new)</span>
                  </button>
                  <button
                    onClick={() => { setShowImport(false); setImportFromId(''); }}
                    className="px-3 py-2 rounded-lg border border-[#2F2F2F] text-gray-500 text-xs hover:text-gray-300 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-yellow-500/70 text-xs">This tournament has no squads set up yet.</p>
            )
          )}

          {!importFromId && (
            <button
              onClick={() => setShowImport(false)}
              className="text-gray-600 text-xs hover:text-gray-400 transition-colors cursor-pointer w-fit"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {csvError && <p className="text-red-400 text-xs">{csvError}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Teams list */}
        <div className="flex flex-col gap-3">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Teams ({teams.length})</p>
          <div className="flex gap-2">
            <input
              value={newTeam}
              onChange={(e) => setNewTeam(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTeam()}
              placeholder="Team name…"
              className={`${textInputCls} flex-1`}
            />
            <button onClick={addTeam} className="px-3 py-2 rounded-lg border border-[#FF6800] text-[#FF6800] text-sm hover:bg-[#FF6800]/10 cursor-pointer transition-colors shrink-0">
              Add
            </button>
          </div>
          <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
            {teams.map((t) => (
              <div key={t}
                onClick={() => setSelectedTeam(t)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  selectedTeam === t ? 'border-[#FF6800] bg-[#FF6800]/10' : 'border-[#2A2A2A] bg-[#111] hover:border-[#3A3A3A]'
                }`}
              >
                <span className={`text-sm ${selectedTeam === t ? 'text-[#FF6800]' : 'text-gray-300'}`}>{t}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-xs">{(squads[t] ?? []).length} players</span>
                  <button onClick={(e) => { e.stopPropagation(); removeTeam(t); }}
                    className="text-gray-600 hover:text-red-400 cursor-pointer transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            {teams.length === 0 && (
              <p className="text-gray-600 text-xs text-center py-4">No teams yet — add one above or import CSV</p>
            )}
          </div>
        </div>

        {/* Squad editor */}
        <div className="flex flex-col gap-3">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">
            {selectedTeam ? `${selectedTeam} — Squad (${(squads[selectedTeam] ?? []).length})` : 'Select a team'}
          </p>
          {selectedTeam ? (
            <>
              <div className="flex gap-2">
                <input
                  value={newPlayer}
                  onChange={(e) => setNewPlayer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                  placeholder="Player name…"
                  className={`${textInputCls} flex-1`}
                />
                <button onClick={addPlayer} className="px-3 py-2 rounded-lg border border-[#FF6800] text-[#FF6800] text-sm hover:bg-[#FF6800]/10 cursor-pointer transition-colors shrink-0">
                  Add
                </button>
              </div>
              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                {(squads[selectedTeam] ?? []).map((player, i) => (
                  <div key={player} className="flex items-center gap-2 px-3 py-2 bg-[#111] border border-[#2A2A2A] rounded-lg">
                    <span className="text-gray-600 text-xs w-5 shrink-0">{i + 1}.</span>
                    <span className="text-gray-300 text-sm flex-1">{player}</span>
                    <button onClick={() => removePlayer(player)} className="text-gray-600 hover:text-red-400 cursor-pointer transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {(squads[selectedTeam] ?? []).length === 0 && (
                  <p className="text-gray-600 text-xs text-center py-4">No players yet</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-32 border border-dashed border-[#2A2A2A] rounded-lg">
              <p className="text-gray-600 text-sm">Click a team to edit its squad</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {saved && <span className="text-green-400 text-xs self-center">Saved!</span>}
        <Button loading={isLoading} onClick={handleSave}>Save Teams & Squads</Button>
      </div>
    </div>
  );
};

// ── Match Schedule Manager ─────────────────────────────────────────────────────

const MatchSchedule = ({ tournamentId, teams }: { tournamentId: string; teams: string[] }) => {
  const { data: matches = [], isLoading } = useGetMatchesQuery(tournamentId, { skip: !tournamentId });
  const [createMatch, { isLoading: creating }] = useCreateAdminMatchMutation();
  const [updateMatch] = useUpdateMatchMutation();
  const [deleteMatch] = useDeleteAdminMatchMutation();
  const [showForm, setShowForm] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [csvSuccess, setCsvSuccess] = useState('');
  const [bulkCreate] = useBulkCreateMatchesMutation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    matchNumber: '', teamA: '', teamB: '', venue: '', date: '', time: '19:30',
  });
  const [formError, setFormError] = useState('');

  const handleAddMatch = async () => {
    setFormError('');
    if (!form.matchNumber || !form.teamA || !form.teamB || !form.date) {
      setFormError('Match number, both teams, and date are required.'); return;
    }
    const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();
    try {
      await createMatch({
        tournamentId, matchNumber: Number(form.matchNumber),
        teamA: form.teamA, teamB: form.teamB,
        venue: form.venue || undefined, scheduledAt,
      }).unwrap();
      setForm({ matchNumber: '', teamA: '', teamB: '', venue: '', date: '', time: '19:30' });
      setShowForm(false);
    } catch { setFormError('Failed to create match.'); }
  };

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError(''); setCsvSuccess('');
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = parseMatchCSV(ev.target?.result as string);
        if (parsed.length === 0) { setCsvError('No valid rows found in CSV.'); return; }
        const result = await bulkCreate({ tournamentId, matches: parsed }).unwrap();
        setCsvSuccess(`${result.count} match(es) imported successfully!`);
        setTimeout(() => setCsvSuccess(''), 3000);
      } catch { setCsvError('Import failed — check CSV format.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleStatusChange = async (id: string, status: 'upcoming' | 'live' | 'completed') => {
    await updateMatch({ id, body: { status } });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this match?')) return;
    await deleteMatch(id);
  };

  const statusColors: Record<string, string> = {
    upcoming: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    live: 'text-green-400 bg-green-400/10 border-green-400/20',
    completed: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#FF6800] text-[#FF6800] text-xs hover:bg-[#FF6800]/10 cursor-pointer transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Match
        </button>
        <button
          onClick={() => downloadCSV(MATCH_SAMPLE, 'matches_sample.csv')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2F2F2F] text-gray-400 text-xs hover:border-[#FF6800] hover:text-white cursor-pointer transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Sample CSV
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2F2F2F] text-gray-400 text-xs hover:border-[#FF6800] hover:text-white cursor-pointer transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
          </svg>
          Import CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCSV} />
      </div>

      {csvError && <p className="text-red-400 text-xs">{csvError}</p>}
      {csvSuccess && <p className="text-green-400 text-xs">{csvSuccess}</p>}

      {/* Add match form */}
      {showForm && (
        <div className="bg-[#1A1A1A] border border-[#2F2F2F] rounded-xl p-4 flex flex-col gap-3">
          <p className="text-white text-sm font-medium">Add New Match</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="Match #">
              <input type="number" value={form.matchNumber} onChange={(e) => setForm((f) => ({ ...f, matchNumber: e.target.value }))} className={textInputCls} placeholder="1" />
            </Field>
            <Field label="Team A">
              {teams.length > 0 ? (
                <select value={form.teamA} onChange={(e) => setForm((f) => ({ ...f, teamA: e.target.value }))} className={textInputCls}>
                  <option value="">Select…</option>
                  {teams.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : (
                <input value={form.teamA} onChange={(e) => setForm((f) => ({ ...f, teamA: e.target.value }))} className={textInputCls} placeholder="Team A" />
              )}
            </Field>
            <Field label="Team B">
              {teams.length > 0 ? (
                <select value={form.teamB} onChange={(e) => setForm((f) => ({ ...f, teamB: e.target.value }))} className={textInputCls}>
                  <option value="">Select…</option>
                  {teams.filter((t) => t !== form.teamA).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : (
                <input value={form.teamB} onChange={(e) => setForm((f) => ({ ...f, teamB: e.target.value }))} className={textInputCls} placeholder="Team B" />
              )}
            </Field>
            <Field label="Date">
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={textInputCls} />
            </Field>
            <Field label="Time (24h)">
              <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className={textInputCls} />
            </Field>
            <Field label="Venue (optional)">
              <input value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} className={textInputCls} placeholder="Stadium name" />
            </Field>
          </div>
          {formError && <p className="text-red-400 text-xs">{formError}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button loading={creating} onClick={handleAddMatch}>Add Match</Button>
          </div>
        </div>
      )}

      {/* Match list */}
      {isLoading ? (
        <div className="flex flex-col gap-2">{[1,2,3].map((n) => <div key={n} className="h-12 bg-[#1E1E1E] rounded-lg animate-pulse" />)}</div>
      ) : matches.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No matches yet — add one above or import CSV.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {matches.map((match) => (
            <div key={match._id} className="bg-[#1A1A1A] border border-[#2F2F2F] rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
              <span className="text-gray-600 text-xs font-mono shrink-0">#{match.matchNumber}</span>
              <span className="text-white text-sm font-medium flex-1 min-w-0 truncate">{match.teamA} vs {match.teamB}</span>
              <span className="text-gray-500 text-xs shrink-0 hidden sm:block">
                {new Date(match.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
              {match.venue && <span className="text-gray-600 text-xs shrink-0 hidden md:block">{match.venue}</span>}
              <div className="flex items-center gap-1.5 shrink-0">
                {(['upcoming', 'live', 'completed'] as const).map((s) => (
                  <button key={s}
                    onClick={() => handleStatusChange(match._id, s)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer font-medium ${
                      match.status === s ? statusColors[s] : 'border-[#2A2A2A] text-gray-600 hover:border-[#3A3A3A]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button onClick={() => handleDelete(match._id)} className="text-gray-600 hover:text-red-400 cursor-pointer transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Multi-player tie picker (for match result fields that can have ties) ───────

const TiedPlayersPick = ({
  label, values, onChange, options,
}: {
  label: string; values: string[]; onChange: (v: string[]) => void; options: string[];
}) => {
  const filtered = options.filter((o) => !values.includes(o));
  const remove = (name: string) => onChange(values.filter((v) => v !== name));
  const add = (name: string) => { if (name && !values.includes(name)) onChange([...values, name]); };
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-gray-400 text-xs font-medium">{label}</label>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {values.map((name) => (
            <span key={name} className="flex items-center gap-1.5 bg-[#FF6800]/10 border border-[#FF6800]/25 rounded-full px-2.5 py-1 text-xs text-gray-200">
              {name}
              <button onClick={() => remove(name)} className="text-gray-500 hover:text-red-400 cursor-pointer transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
      <SearchDropdown options={filtered} value="" onChange={add} placeholder={values.length ? 'Add tied player…' : 'Search player…'} />
    </div>
  );
};

// ── Match result edit row ──────────────────────────────────────────────────────

const MatchRow = ({ match, squadPlayers }: { match: Match; squadPlayers: string[] }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    status: match.status,
    winner: match.result?.winner ?? '',
    topBatter: match.result?.topBatter ?? [] as string[],
    topBowler: match.result?.topBowler ?? [] as string[],
    playerOfMatch: match.result?.playerOfMatch ?? [] as string[],
    powerplayScoreA: match.result?.powerplayScoreA ?? '',
    powerplayScoreB: match.result?.powerplayScoreB ?? '',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [updateMatch, { isLoading }] = useUpdateMatchMutation();

  const handleSave = async () => {
    setError(''); setSaved(false);
    try {
      const body: Parameters<typeof updateMatch>[0]['body'] = { status: form.status as any };
      if (form.status === 'completed') {
        body.result = {
          winner: form.winner || undefined,
          topBatter: form.topBatter.length ? form.topBatter : undefined,
          topBowler: form.topBowler.length ? form.topBowler : undefined,
          playerOfMatch: form.playerOfMatch.length ? form.playerOfMatch : undefined,
          powerplayScoreA: form.powerplayScoreA !== '' ? Number(form.powerplayScoreA) : undefined,
          powerplayScoreB: form.powerplayScoreB !== '' ? Number(form.powerplayScoreB) : undefined,
        };
      }
      await updateMatch({ id: match._id, body }).unwrap();
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setError((err as { data?: { message?: string } })?.data?.message ?? 'Failed to save');
    }
  };

  const statusColors: Record<string, string> = {
    upcoming: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    live: 'text-green-400 bg-green-400/10 border-green-400/20',
    completed: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2F2F2F] rounded-xl overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-[#222] transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-gray-600 text-xs font-mono shrink-0">#{match.matchNumber}</span>
          <span className="text-white text-sm font-medium truncate">{match.teamA} vs {match.teamB}</span>
          <span className="text-gray-600 text-xs hidden sm:block shrink-0">
            {new Date(match.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[match.status]}`}>{match.status}</span>
          <svg className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-[#2F2F2F] pt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-400 text-xs font-medium">Status</label>
            <div className="flex gap-2">
              {(['upcoming', 'live', 'completed'] as const).map((s) => (
                <button key={s} onClick={() => setForm((f) => ({ ...f, status: s }))}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    form.status === s ? 'border-[#FF6800] bg-[#FF6800]/10 text-[#FF6800]' : 'border-[#2F2F2F] text-gray-400 hover:border-[#3A3A3A]'
                  }`}>{s}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-gray-400 text-xs font-medium">Winner</label>
              <div className="flex gap-2">
                {[match.teamA, match.teamB].map((team) => (
                  <button key={team} onClick={() => setForm((f) => ({ ...f, winner: f.winner === team ? '' : team }))}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                      form.winner === team ? 'border-[#FF6800] bg-[#FF6800]/10 text-[#FF6800]' : 'border-[#2F2F2F] text-gray-400 hover:border-[#3A3A3A]'
                    }`}>{team}</button>
                ))}
              </div>
            </div>

            {([
              { key: 'topBatter', label: 'Top Batter' },
              { key: 'topBowler', label: 'Top Bowler' },
              { key: 'playerOfMatch', label: 'Player of the Match' },
            ] as const).map(({ key, label }) => (
              <TiedPlayersPick
                key={key}
                label={label}
                values={(form as any)[key] as string[]}
                onChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
                options={squadPlayers}
              />
            ))}

            <div className="flex flex-col gap-1.5">
              <label className="text-gray-400 text-xs font-medium">{match.teamA} Powerplay Score</label>
              <input type="number" min={0} max={120} value={form.powerplayScoreA}
                onChange={(e) => setForm((f) => ({ ...f, powerplayScoreA: e.target.value }))}
                placeholder="e.g. 62" className={`${textInputCls} text-center`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-gray-400 text-xs font-medium">{match.teamB} Powerplay Score</label>
              <input type="number" min={0} max={120} value={form.powerplayScoreB}
                onChange={(e) => setForm((f) => ({ ...f, powerplayScoreB: e.target.value }))}
                placeholder="e.g. 48" className={`${textInputCls} text-center`} />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}
          {saved && <p className="text-green-400 text-xs">Saved successfully!</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={isLoading} onClick={handleSave}>Save Match</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Category result row ────────────────────────────────────────────────────────
//
// State model: groups = string[][]
//   Each group = one rank position, potentially with multiple tied players.
//   e.g. [['Rohit Sharma', 'Virat Kohli'], ['KL Rahul']]
//   → Pos 1 (tie): Rohit & Virat · Pos 2: KL Rahul  (dense ranking)
//
// Position of group[i] = i + 1  (dense: tied groups never skip ranks)

function buildInitGroups(
  result: { rankings: { position: number; name: string }[] } | undefined,
  maxSlots: number
): string[][] {
  if (!result || result.rankings.length === 0) {
    return Array.from({ length: maxSlots }, () => ['']);
  }
  // Re-build groups by collating same-position entries
  const byPos = new Map<number, string[]>();
  for (const r of result.rankings) {
    if (!byPos.has(r.position)) byPos.set(r.position, []);
    byPos.get(r.position)!.push(r.name);
  }
  const sortedPositions = Array.from(byPos.keys()).sort((a, b) => a - b);
  const groups = sortedPositions.map((p) => byPos.get(p)!);
  // Pad up to maxSlots rank-groups if needed
  while (groups.length < maxSlots) groups.push(['']);
  return groups;
}

const CategoryRow = ({ category, result, tournamentId, options }: {
  category: Category; result?: { rankings: { position: number; name: string }[] };
  tournamentId: string; options: string[];
}) => {
  const [open, setOpen] = useState(false);
  // exact_match categories (e.g. Player of the Tournament): admin enters 1 actual result
  const maxSlots = category.scoringType === 'exact_match' ? 1 : (category.selectionCount ?? 3);

  const [groups, setGroups] = useState<string[][]>(() => buildInitGroups(result, maxSlots));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [setActualResult, { isLoading }] = useSetActualResultMutation();

  // Dense ranking: group[0] = rank 1, group[1] = rank 2, etc.
  // Tied players share the same rank; the next rank is always groupIdx + 1.
  const getPosition = (groupIdx: number) => groupIdx + 1;
  const isTeamCategory = category.type === 'team_position';

  // All names currently entered (for cross-group dedup)
  const allNames = groups.flat().filter(Boolean);

  const setName = (gi: number, ni: number, val: string) => {
    setGroups((prev) => prev.map((g, i) => i === gi ? g.map((n, j) => j === ni ? val : n) : g));
  };

  const removeName = (gi: number, ni: number) => {
    setGroups((prev) => prev.map((g, i) => {
      if (i !== gi) return g;
      const next = g.filter((_, j) => j !== ni);
      return next.length === 0 ? [''] : next; // keep at least one empty slot per group
    }));
  };

  const addTie = (gi: number) => {
    setGroups((prev) => prev.map((g, i) => i === gi ? [...g, ''] : g));
  };

  const handleSave = async () => {
    setError(''); setSaved(false);
    const flat: { position: number; name: string }[] = [];
    groups.forEach((g, gi) => {
      const pos = getPosition(gi);
      g.filter(Boolean).forEach((name) => flat.push({ position: pos, name: name.trim() }));
    });
    if (flat.length === 0) { setError('Enter at least one result'); return; }
    try {
      await setActualResult({ tournamentId, categoryId: category._id, rankings: flat }).unwrap();
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch { setError('Failed to save'); }
  };

  const hasResult = result && result.rankings.length > 0;

  return (
    <div className="bg-[#1A1A1A] border border-[#2F2F2F] rounded-xl overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-[#222] transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-white text-sm font-medium truncate">{category.name}</span>
          <span className="text-gray-600 text-xs shrink-0">{maxSlots} picks{isTeamCategory ? '' : ' · ties allowed'}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasResult
            ? <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">Results in</span>
            : <span className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">Pending</span>}
          <svg className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-[#2F2F2F] pt-4 flex flex-col gap-4">
          {groups.map((group, gi) => {
            const pos = getPosition(gi);
            return (
              <div key={gi} className="flex flex-col gap-2">
                {/* Rank label + tie indicator */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs font-mono w-6 text-right shrink-0">#{pos}</span>
                  {group.filter(Boolean).length > 1 && (
                    <span className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded-full">
                      Tied
                    </span>
                  )}
                </div>

                {/* Name slots for this rank */}
                {group.map((name, ni) => {
                  const slotOptions = options.filter((o) => !allNames.includes(o) || o === name);
                  return (
                    <div key={ni} className="flex items-center gap-2 ml-8">
                      <div className="flex-1">
                        <SearchDropdown
                          options={slotOptions}
                          value={name}
                          onChange={(v) => setName(gi, ni, v)}
                          placeholder={`Rank ${pos}${group.length > 1 ? ` (tied ${ni + 1})` : ''} — search name…`}
                        />
                      </div>
                      {/* Remove tied entry (only if >1 in group) */}
                      {group.length > 1 && (
                        <button
                          onClick={() => removeName(gi, ni)}
                          className="text-gray-600 hover:text-red-400 cursor-pointer transition-colors shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Add tie button — only for non-team categories */}
                {!isTeamCategory && (
                  <button
                    onClick={() => addTie(gi)}
                    className="ml-8 flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#FF6800] transition-colors cursor-pointer w-fit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add tied player at rank {pos}
                  </button>
                )}
              </div>
            );
          })}

          <p className="text-gray-600 text-xs">
            {isTeamCategory
              ? 'Enter the 4 teams that qualified. No ties in team standings.'
              : 'Tied players share the same rank (dense: 1, 1, 2 — not 1, 1, 3). Points: 1st=10, 2nd=8, 3rd=6, 4th=4, 5th=2'}
          </p>

          {error && <p className="text-red-400 text-xs">{error}</p>}
          {saved && <p className="text-green-400 text-xs">Saved!</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={isLoading} onClick={handleSave}>Save Results</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Admin Page ─────────────────────────────────────────────────────────────────

type AdminTab = 'tournaments' | 'schedule' | 'matches' | 'results';

export const Admin = () => {
  const [tab, setTab] = useState<AdminTab>('tournaments');
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [tournamentStatusValue, setTournamentStatusValue] = useState('');
  const [statusSaved, setStatusSaved] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [expandedSquadsId, setExpandedSquadsId] = useState<string | null>(null);

  const { data: tournaments = [], isLoading: tournamentsLoading } = useGetAdminTournamentsQuery();
  const activeTournamentId = selectedTournamentId || tournaments[0]?._id || '';
  const activeTournament = tournaments.find((t) => t._id === activeTournamentId);

  const { data: matches = [], isLoading: matchesLoading } = useGetMatchesQuery(activeTournamentId, {
    skip: !activeTournamentId || tab !== 'matches',
  });
  const { data: categories = [], isLoading: categoriesLoading } = useGetTournamentCategoriesQuery(activeTournamentId, {
    skip: !activeTournamentId || tab !== 'results',
  });
  const { data: actualResults = [] } = useGetAdminResultsQuery(activeTournamentId, {
    skip: !activeTournamentId || tab !== 'results',
  });
  const { data: tournamentOptions } = useGetTournamentOptionsQuery(activeTournamentId, {
    skip: !activeTournamentId,
  });
  const [setTournamentStatus, { isLoading: statusLoading }] = useSetTournamentStatusMutation();

  const handleTournamentStatus = async () => {
    if (!tournamentStatusValue) return;
    await setTournamentStatus({ id: activeTournamentId, status: tournamentStatusValue });
    setStatusSaved(true);
    setTimeout(() => setStatusSaved(false), 2000);
  };

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'tournaments', label: '🏆 Tournaments' },
    { id: 'schedule', label: '📅 Schedule' },
    { id: 'matches', label: '🏏 Match Results' },
    { id: 'results', label: '📊 Tournament Results' },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-white text-2xl font-bold">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Manage tournaments, matches, and results</p>
        </div>

        {/* Tournament selector + status */}
        <div className="bg-[#1E1E1E] border border-[#2F2F2F] rounded-xl p-5 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-gray-400 text-xs font-medium">Active Tournament</label>
            {tournamentsLoading ? (
              <div className="h-9 bg-[#2A2A2A] rounded-lg animate-pulse" />
            ) : (
              <select value={activeTournamentId} onChange={(e) => setSelectedTournamentId(e.target.value)}
                className="bg-[#111] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#FF6800] transition-colors">
                {tournaments.map((t) => (
                  <option key={t._id} value={t._id}>{t.name} ({t.status})</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-400 text-xs font-medium">Tournament Status</label>
            <div className="flex gap-2">
              <select value={tournamentStatusValue} onChange={(e) => setTournamentStatusValue(e.target.value)}
                className="bg-[#111] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#FF6800] transition-colors">
                <option value="">— Change status —</option>
                <option value="upcoming">upcoming</option>
                <option value="live">live</option>
                <option value="completed">completed</option>
              </select>
              <Button loading={statusLoading} disabled={!tournamentStatusValue} onClick={handleTournamentStatus} variant="secondary">
                {statusSaved ? 'Saved!' : 'Apply'}
              </Button>
            </div>
            {activeTournament && (
              <p className="text-gray-600 text-xs">Current: <span className="text-gray-400">{activeTournament.status}</span></p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#1A1A1A] border border-[#2F2F2F] rounded-xl p-1 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                tab === t.id ? 'bg-[#FF6800] text-white' : 'text-gray-400 hover:text-white'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tournaments tab ── */}
        {tab === 'tournaments' && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-end">
              <Button onClick={() => { setShowCreateForm(true); setEditingTournament(null); }}>+ New Tournament</Button>
            </div>

            {(showCreateForm && !editingTournament) && (
              <TournamentForm onDone={() => setShowCreateForm(false)} />
            )}
            {editingTournament && (
              <TournamentForm existing={editingTournament} onDone={() => setEditingTournament(null)} />
            )}

            {tournamentsLoading ? (
              <div className="flex flex-col gap-3">{[1,2].map((n) => <div key={n} className="h-20 bg-[#1E1E1E] rounded-xl animate-pulse" />)}</div>
            ) : tournaments.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">No tournaments yet — create one above.</div>
            ) : (
              tournaments.map((t) => {
                const squadsOpen = expandedSquadsId === t._id;
                const teamCount = (t.teams ?? []).length;
                return (
                  <div key={t._id} className={`bg-[#1A1A1A] border rounded-xl overflow-hidden transition-colors ${squadsOpen ? 'border-[#FF6800]/30' : 'border-[#2F2F2F]'}`}>
                    {/* Card header */}
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-semibold">{t.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                            t.status === 'live' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                            t.status === 'completed' ? 'text-gray-400 bg-gray-400/10 border-gray-400/20' :
                            'text-blue-400 bg-blue-400/10 border-blue-400/20'
                          }`}>{t.status}</span>
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {t.sport} · {t.type} · Season {t.season} ·{' '}
                          {new Date(t.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} –{' '}
                          {new Date(t.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-gray-600 text-xs mt-0.5">{t.totalMatches} matches</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Squads pill — shows team count, click to expand */}
                        <button
                          onClick={() => setExpandedSquadsId(squadsOpen ? null : t._id)}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                            squadsOpen
                              ? 'border-[#FF6800]/50 text-[#FF6800] bg-[#FF6800]/10'
                              : teamCount > 0
                              ? 'border-[#2F2F2F] text-gray-300 hover:border-[#FF6800]/50 hover:text-[#FF6800]'
                              : 'border-dashed border-[#3A3A3A] text-gray-500 hover:border-[#FF6800]/50 hover:text-[#FF6800]'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {teamCount > 0 ? `${teamCount} teams` : 'No squads'}
                          <svg className={`w-3 h-3 transition-transform ${squadsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { setEditingTournament(t); setShowCreateForm(false); setExpandedSquadsId(null); }}
                          className="text-gray-400 hover:text-white text-xs px-3 py-1.5 border border-[#2F2F2F] rounded-lg hover:border-[#3A3A3A] cursor-pointer transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    {/* Inline squads manager */}
                    {squadsOpen && (
                      <div className="border-t border-[#2F2F2F] px-5 pb-5 pt-4 bg-[#111]/40">
                        <div className="mb-4">
                          <p className="text-white font-semibold text-sm">Teams & Squads</p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            These players are specific to <span className="text-gray-300">{t.name}</span> — other tournaments have their own independent squads.
                          </p>
                        </div>
                        <SquadsManager key={t._id} tournament={t} allTournaments={tournaments} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Schedule tab ── */}
        {tab === 'schedule' && (
          <div className="flex flex-col gap-3">
            {!activeTournamentId ? (
              <p className="text-gray-500 text-sm text-center py-8">No tournament selected.</p>
            ) : (
              <MatchSchedule
                tournamentId={activeTournamentId}
                teams={activeTournament?.teams ?? []}
              />
            )}
          </div>
        )}

        {/* ── Match results tab ── */}
        {tab === 'matches' && (
          <div className="flex flex-col gap-3">
            {!activeTournamentId ? (
              <p className="text-gray-500 text-sm text-center py-8">No tournaments found.</p>
            ) : matchesLoading ? (
              <div className="flex flex-col gap-3">{[1,2,3].map((n) => <div key={n} className="h-16 bg-[#1E1E1E] rounded-xl animate-pulse" />)}</div>
            ) : matches.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">No matches. Add them in the Schedule tab.</div>
            ) : (
              matches.map((match) => {
                const squads = tournamentOptions?.squads ?? {};
                const squadPlayers = Array.from(new Set([...(squads[match.teamA] ?? []), ...(squads[match.teamB] ?? [])]));
                return <MatchRow key={match._id} match={match} squadPlayers={squadPlayers} />;
              })
            )}
          </div>
        )}

        {/* ── Tournament results tab ── */}
        {tab === 'results' && (
          <div className="flex flex-col gap-3">
            {!activeTournamentId ? (
              <p className="text-gray-500 text-sm text-center py-8">No tournaments found.</p>
            ) : categoriesLoading ? (
              <div className="flex flex-col gap-3">{[1,2,3].map((n) => <div key={n} className="h-16 bg-[#1E1E1E] rounded-xl animate-pulse" />)}</div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">No categories for this tournament.</div>
            ) : (
              [...categories]
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((cat) => (
                  <CategoryRow key={cat._id} category={cat}
                    result={actualResults.find((r) => r.category._id === cat._id)}
                    tournamentId={activeTournamentId}
                    options={cat.type === 'team_position'
                      ? (tournamentOptions?.teams ?? [])
                      : (tournamentOptions?.players ?? [])} />
                ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};
