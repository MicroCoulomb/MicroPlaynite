"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  Lock,
  Pencil,
  Search,
  Settings,
  X,
} from "lucide-react";
import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameRecord, GamesResponse, SortDirection, SortField, StatsResponse } from "@/lib/types";

const STANDARD_STATUSES = ["Abandoned", "Backlog", "Completed", "Not Played", "Played", "Playing"];
const GRID_OPTIONS = [6, 8, 10, 12];

type Preferences = {
  columns: number;
  defaultSort: SortField;
  defaultDirection: SortDirection;
};

const DEFAULT_PREFS: Preferences = { columns: 8, defaultSort: "rating", defaultDirection: "desc" };

function loadPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem("micro-playnite-preferences-v2");
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function LibraryApp() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<SortField>("rating");
  const [direction, setDirection] = useState<SortDirection>("desc");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<GamesResponse>({ games: [], page: 1, pageSize: 40, total: 0, totalPages: 1 });
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editUnlocked, setEditUnlocked] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingGame, setEditingGame] = useState<GameRecord | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loaded = loadPreferences();
    setPrefs(loaded);
    setSort(loaded.defaultSort);
    setDirection(loaded.defaultDirection);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, sort, direction, statuses]);

  const loadAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/status", { cache: "no-store" });
      const body = await response.json();
      setEditUnlocked(Boolean(body.unlocked));
      if (!body.unlocked) setEditMode(false);
    } catch {
      setEditUnlocked(false);
      setEditMode(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch("/api/stats", { cache: "no-store" });
      if (!response.ok) return;
      setStats(await response.json());
    } catch {
      // Statistics are non-critical to the main library.
    }
  }, []);

  useEffect(() => {
    void loadAuth();
    void loadStats();
  }, [loadAuth, loadStats]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadGames() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          q: debouncedQuery,
          sort,
          direction,
          page: String(page),
        });
        if (statuses.length) params.set("status", statuses.join("|"));
        const response = await fetch(`/api/games?${params.toString()}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load the game library.");
        const body: GamesResponse = await response.json();
        setData(body);
        if (page > body.totalPages) setPage(body.totalPages);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message || "Unable to load games.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadGames();
    return () => controller.abort();
  }, [debouncedQuery, sort, direction, statuses, page, refreshKey]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const availableStatuses = useMemo(() => {
    const custom = (stats?.completionCounts || []).map((x) => x.status).filter((x) => !STANDARD_STATUSES.includes(x));
    return [...STANDARD_STATUSES, ...custom];
  }, [stats]);

  function toggleStatus(status: string) {
    setStatuses((current) => current.includes(status) ? current.filter((x) => x !== status) : [...current, status]);
  }

  function updatePreferences(next: Preferences) {
    setPrefs(next);
    localStorage.setItem("micro-playnite-preferences-v2", JSON.stringify(next));
  }

  function goHome() {
    setQuery("");
    setStatuses([]);
    setSort(prefs.defaultSort);
    setDirection(prefs.defaultDirection);
    setPage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function refreshAfterRating(gameId: string, score: number) {
    setData((current) => ({
      ...current,
      games: current.games.map((game) => game.playnite_game_id === gameId ? { ...game, user_score: score } : game),
    }));
    await loadStats();
    setRefreshKey((value) => value + 1);
  }

  const gridStyle = { "--desktop-cols": prefs.columns } as CSSProperties;

  return (
    <>
      <header className="topbar">
        <button className="logo-button" onClick={goHome} aria-label="Return to library home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/applogo.png" alt="App logo" />
        </button>

        <div className="toolbar">
          <div className="search-wrap">
            <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: "var(--muted)" }} />
            <input
              className="control"
              style={{ paddingLeft: 34 }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search games..."
              aria-label="Search games by title"
            />
            {query && <button className="clear-search" onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}
          </div>

          <select className="control select-control toolbar-sort" value={sort} onChange={(e) => setSort(e.target.value as SortField)} aria-label="Sort field">
            <option value="name">Name</option>
            <option value="rating">Rating</option>
            <option value="release_year">Release year</option>
          </select>
          <button className="icon-control toolbar-direction" onClick={() => setDirection(direction === "asc" ? "desc" : "asc")} title={direction === "asc" ? "Ascending" : "Descending"}>
            {direction === "asc" ? <ArrowUp size={17} /> : <ArrowDown size={17} />}
          </button>

          <div className="filter-wrap toolbar-filter" ref={filterRef}>
            <button className={`icon-control ${statuses.length ? "active" : ""}`} onClick={() => setFilterOpen((v) => !v)} title="Filter completion status">
              <Filter size={17} />
            </button>
            {filterOpen && (
              <div className="popover">
                {availableStatuses.map((status) => (
                  <label className="filter-item" key={status}>
                    <input type="checkbox" checked={statuses.includes(status)} onChange={() => toggleStatus(status)} />
                    <span>{status}</span>
                  </label>
                ))}
                {statuses.length > 0 && <button className="button" style={{ width: "100%", marginTop: 6 }} onClick={() => setStatuses([])}>Clear filter</button>}
              </div>
            )}
          </div>

          <button
            className={`control edit-button toolbar-edit ${editMode ? "active" : ""}`}
            disabled={!editUnlocked}
            title={editUnlocked ? "Toggle Edit Mode" : "Unlock Edit Access in Settings first"}
            onClick={() => setEditMode((v) => !v)}
          >
            <Pencil size={15} />
          </button>

          <button className="icon-control toolbar-settings" onClick={() => setSettingsOpen(true)} title="Settings"><Settings size={18} /></button>
        </div>
      </header>

      <main className="library-shell">
        {error && <div className="notice error">{error}</div>}
        {loading && data.games.length === 0 ? (
          <div className="empty-state">Loading library...</div>
        ) : data.games.length === 0 ? (
          <div className="empty-state">No games match the current search or filter.</div>
        ) : (
          <div className="game-grid" style={gridStyle}>
            {data.games.map((game) => (
              <GameCard key={game.playnite_game_id} game={game} editable={editMode} onEdit={() => editMode && setEditingGame(game)} />
            ))}
          </div>
        )}
      </main>

      <nav className="pagination-dock" aria-label="Pagination">
        <button className="page-button" onClick={() => setPage(1)} disabled={page <= 1} aria-label="First page"><ChevronsLeft size={18} /></button>
        <button className="page-button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={18} /></button>
        <div className="page-label">Page {data.page} of {data.totalPages}</div>
        <button className="page-button" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} aria-label="Next page"><ChevronRight size={18} /></button>
        <button className="page-button" onClick={() => setPage(data.totalPages)} disabled={page >= data.totalPages} aria-label="Last page"><ChevronsRight size={18} /></button>
      </nav>

      <button className="scroll-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top"><ArrowUp size={19} /></button>

      {settingsOpen && (
        <SettingsModal
          prefs={prefs}
          stats={stats}
          unlocked={editUnlocked}
          onClose={() => setSettingsOpen(false)}
          onPrefsChange={(next) => {
            updatePreferences(next);
            setSort(next.defaultSort);
            setDirection(next.defaultDirection);
          }}
          onAuthChanged={async () => { await loadAuth(); }}
        />
      )}

      {editingGame && (
        <RatingModal
          game={editingGame}
          onClose={() => setEditingGame(null)}
          onSaved={async (score) => {
            await refreshAfterRating(editingGame.playnite_game_id, score);
            setEditingGame(null);
          }}
        />
      )}
    </>
  );
}

function GameCard({ game, editable, onEdit }: { game: GameRecord; editable: boolean; onEdit: () => void }) {
  const [imageBroken, setImageBroken] = useState(false);
  const fill = Math.max(0, Math.min(100, game.user_score));
  return (
    <article className={`game-card ${editable ? "editable" : ""}`} onClick={onEdit} title={editable ? "Edit rating" : game.game_title}>
      <div className="cover-frame">
        {game.cover_url && !imageBroken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="cover-image" src={game.cover_url} alt={`${game.game_title} cover`} loading="lazy" onError={() => setImageBroken(true)} />
        ) : (
          <div className="cover-placeholder">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/applogo.png" alt="" />
            <span>NO COVER</span>
          </div>
        )}
      </div>
      <div className="game-title">{game.game_title}</div>
      <div className="rating-row">
        <span className="stars" aria-label={`${game.user_score} out of 100`}>
          <span className="stars-base">★★★★★</span>
          <span className="stars-fill" style={{ width: `${fill}%` }}>★★★★★</span>
        </span>
        <span>{game.user_score} / 100</span>
      </div>
    </article>
  );
}

function RatingModal({ game, onClose, onSaved }: { game: GameRecord; onClose: () => void; onSaved: (score: number) => Promise<void> }) {
  const [scoreText, setScoreText] = useState(String(game.user_score));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const score = Number(scoreText);
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      setError("Enter a whole number from 0 to 100.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/games/${game.playnite_game_id}/rating`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userScore: score }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save rating.");
      await onSaved(score);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header"><h2>Edit Rating</h2><button className="icon-control" onClick={onClose}><X size={17} /></button></div>
        <div className="modal-body">
          <div style={{ marginBottom: 16, color: "#e3e3e7" }}>{game.game_title}</div>
          {error && <div className="notice error">{error}</div>}
          <div className="field">
            <label>User Score (0–100)</label>
            <input type="number" min={0} max={100} step={1} value={scoreText} onChange={(e) => setScoreText(e.target.value)} autoFocus />
          </div>
        </div>
        <div className="modal-footer"><button className="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button></div>
      </div>
    </div>
  );
}

function SettingsModal({
  prefs,
  stats,
  unlocked,
  onClose,
  onPrefsChange,
  onAuthChanged,
}: {
  prefs: Preferences;
  stats: StatsResponse | null;
  unlocked: boolean;
  onClose: () => void;
  onPrefsChange: (prefs: Preferences) => void;
  onAuthChanged: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(prefs);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  async function unlock() {
    setAuthBusy(true); setAuthError("");
    try {
      const response = await fetch("/api/auth/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to unlock.");
      setPassword("");
      await onAuthChanged();
    } catch (e) { setAuthError((e as Error).message); }
    finally { setAuthBusy(false); }
  }

  async function lock() {
    setAuthBusy(true); setAuthError("");
    try {
      await fetch("/api/auth/lock", { method: "POST" });
      await onAuthChanged();
    } finally { setAuthBusy(false); }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide">
        <div className="modal-header"><h2>Settings</h2><button className="icon-control" onClick={onClose}><X size={17} /></button></div>
        <div className="modal-body">
          <h3 className="settings-section-title first">Edit Access</h3>
          <div className="notice compact">Enter your master password to enable Edit Mode.</div>
          {authError && <div className="notice error">{authError}</div>}
          {unlocked ? (
            <button className="button danger" disabled={authBusy} onClick={lock}><span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><Lock size={15} /> Lock Edit Access</span></button>
          ) : (
            <div className="field">
              <label>Master Password</label>
              <div className="password-row">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void unlock()} />
                <button className="button primary" disabled={authBusy || !password} onClick={unlock}>{authBusy ? "Unlocking..." : "Unlock"}</button>
              </div>
            </div>
          )}

          <h3 className="settings-section-title">Display Settings</h3>
          <div className="settings-grid">
            <div className="field">
              <label>Desktop grid columns</label>
              <select value={draft.columns} onChange={(e) => setDraft({ ...draft, columns: Number(e.target.value) })}>
                {GRID_OPTIONS.map((n) => <option value={n} key={n}>{n} per row</option>)}
              </select>
            </div>
            <div className="field">
              <label>Default sorting</label>
              <select value={draft.defaultSort} onChange={(e) => setDraft({ ...draft, defaultSort: e.target.value as SortField })}>
                <option value="name">Name</option><option value="rating">Rating</option><option value="release_year">Release year</option>
              </select>
            </div>
            <div className="field">
              <label>Default sort direction</label>
              <select value={draft.defaultDirection} onChange={(e) => setDraft({ ...draft, defaultDirection: e.target.value as SortDirection })}>
                <option value="asc">Ascending</option><option value="desc">Descending</option>
              </select>
            </div>
          </div>
          <button className="button primary" onClick={() => onPrefsChange(draft)}>Save display settings</button>

          <h3 className="settings-section-title">Library Statistics</h3>
          <div className="settings-grid">
            <Stat label="Total games" value={stats?.totalGames ?? "—"} />
            <Stat label="Rated games" value={stats?.ratedGames ?? "—"} />
            <Stat label="Average rating" value={stats ? `${stats.averageRating} / 100` : "—"} />
          </div>
          {!!stats?.completionCounts.length && <div className="status-list">{stats.completionCounts.map((s) => <div key={s.status}>{s.status}: <strong>{s.count}</strong></div>)}</div>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="stat-card"><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>;
}
