'use client';

import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SchedulePackage, ScheduleWalkdown } from '@/types/schedule';

type SearchCtx = { term: string; currentMatchId: string | null };
const SearchContext = createContext<SearchCtx>({ term: '', currentMatchId: null });

function Highlight({ text }: { text: string }) {
  const { term } = useContext(SearchContext);
  if (!term || !text) return <>{text}</>;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  const lower = term.toLowerCase();
  return (
    <>
      {parts.map((part, i) =>
        part && part.toLowerCase() === lower ? (
          <mark key={i} className="bg-purple-300 text-purple-950 rounded-sm px-0.5">{part}</mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

function isCurrentMatch(id: string, current: string | null): boolean {
  return current === id;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const GROUP_LABELS: Record<string, string> = {
  'GRP-FOREMOST': 'Foremost 750 bbl Tanks',
  'GRP-CADO-AIR': 'Cado Start Air Skid',
  'GRP-OPSCO-SALES': 'OPSCO Sales Skid',
};

function isoAdd(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}
function prettyDate(iso: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '—';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}-${MONTHS_SHORT[m - 1]}-${y}`;
}
function fmtWeight(w: string | null): string {
  if (!w) return '';
  if (!Number.isNaN(Number(w))) return `${Number(w).toLocaleString()} lbs`;
  return w.replace(/\s*lbs\s*$/i, '') + ' lbs';
}
function keyYM(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

type Unit =
  | { kind: 'item'; pkg: SchedulePackage }
  | { kind: 'group'; group: string; members: SchedulePackage[] };

type WalkdownLevel = 30 | 60 | 90;

type WalkdownModalState = {
  mode: 'create' | 'edit';
  id?: string;
  date: string;
  level: WalkdownLevel;
  name: string;
};

const WD_STYLES: Record<WalkdownLevel, { bg: string; text: string; border: string; solid: string }> = {
  30: { bg: 'bg-green-100',  text: 'text-green-900',  border: 'border-green-300',  solid: 'bg-green-600' },
  60: { bg: 'bg-yellow-100', text: 'text-yellow-900', border: 'border-yellow-300', solid: 'bg-yellow-500' },
  90: { bg: 'bg-red-100',    text: 'text-red-900',    border: 'border-red-300',    solid: 'bg-red-600' },
};

export function ScheduleView({
  initialPackages,
  initialWalkdowns,
}: {
  initialPackages: SchedulePackage[];
  initialWalkdowns: ScheduleWalkdown[];
}) {
  const [packages, setPackages] = useState<SchedulePackage[]>(initialPackages);
  const [walkdowns, setWalkdowns] = useState<ScheduleWalkdown[]>(initialWalkdowns);
  const [toast, setToast] = useState<string>('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragGroup, setDragGroup] = useState<string | null>(null);
  const calWrapRef = useRef<HTMLDivElement>(null);
  const [visibleYMs, setVisibleYMs] = useState<Set<string>>(new Set());
  const [panelOpen, setPanelOpen] = useState(true);
  const [showPackages, setShowPackages] = useState(true);
  const [showWalkdowns, setShowWalkdowns] = useState(true);
  const [walkdownModal, setWalkdownModal] = useState<WalkdownModalState | null>(null);
  const [printModal, setPrintModal] = useState<{ from: string; to: string } | null>(null);
  const [printRange, setPrintRange] = useState<{ from: string; to: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  type SearchMatch = { kind: 'pkg' | 'group' | 'wd'; matchId: string; date: string | null };
  const searchMatches = useMemo<SearchMatch[]>(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    const out: SearchMatch[] = [];
    const seenGroups = new Set<string>();
    packages.forEach((p) => {
      const hit = p.tag.toLowerCase().includes(term) || p.ewp.toLowerCase().includes(term);
      if (!hit) return;
      if (p.convoy_group) {
        if (!seenGroups.has(p.convoy_group)) {
          seenGroups.add(p.convoy_group);
          out.push({ kind: 'group', matchId: `group-${p.convoy_group}`, date: p.planned_ship_date });
        }
      } else {
        out.push({ kind: 'pkg', matchId: `pkg-${p.id}`, date: p.planned_ship_date });
      }
    });
    walkdowns.forEach((w) => {
      if (w.name.toLowerCase().includes(term)) {
        out.push({ kind: 'wd', matchId: `wd-${w.id}`, date: w.event_date });
      }
    });
    out.sort((a, b) => (a.date ?? 'zzzz').localeCompare(b.date ?? 'zzzz') || a.matchId.localeCompare(b.matchId));
    return out;
  }, [packages, walkdowns, searchTerm]);

  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchTerm]);

  const currentMatch = searchMatches[currentMatchIndex] ?? null;
  const currentMatchId = currentMatch?.matchId ?? null;

  useEffect(() => {
    if (!currentMatch) return;
    if (!currentMatch.date) return;
    const el = document.querySelector(`[data-search-id="${currentMatch.matchId}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentMatch]);

  function nextMatch() {
    if (searchMatches.length === 0) return;
    setCurrentMatchIndex((i) => (i + 1) % searchMatches.length);
  }
  function prevMatch() {
    if (searchMatches.length === 0) return;
    setCurrentMatchIndex((i) => (i - 1 + searchMatches.length) % searchMatches.length);
  }

  useEffect(() => {
    const handler = () => setPrintRange(null);
    window.addEventListener('afterprint', handler);
    return () => window.removeEventListener('afterprint', handler);
  }, []);

  useEffect(() => setPackages(initialPackages), [initialPackages]);
  useEffect(() => setWalkdowns(initialWalkdowns), [initialWalkdowns]);

  const monthRange = useMemo(() => {
    const dates = packages.map((p) => p.planned_ship_date).filter((d): d is string => !!d).sort();
    let start = dates[0] || '2026-07-01';
    let end = dates[dates.length - 1] || '2026-07-01';
    let sy = +start.slice(0, 4);
    let sm = +start.slice(5, 7) - 1;
    let ey = +end.slice(0, 4);
    let em = +end.slice(5, 7) - 1;
    em++;
    if (em > 11) { em = 0; ey++; }
    const out: [number, number][] = [];
    let y = sy, m = sm;
    while (y < ey || (y === ey && m <= em)) {
      out.push([y, m]);
      m++;
      if (m > 11) { m = 0; y++; }
    }
    return out;
  }, [packages]);

  const groupMembers = useCallback(
    (g: string) => packages.filter((p) => p.convoy_group === g),
    [packages]
  );

  const groupRTS = useCallback(
    (g: string): string | null => {
      const floors = groupMembers(g).map((p) => p.rts_date).filter((d): d is string => !!d).sort();
      return floors.length ? floors[floors.length - 1] : null;
    },
    [groupMembers]
  );

  function unitsForDate(iso: string): Unit[] {
    const out: Unit[] = [];
    const seen = new Set<string>();
    packages
      .filter((p) => p.planned_ship_date === iso)
      .forEach((p) => {
        if (p.convoy_group) {
          if (!seen.has(p.convoy_group)) {
            seen.add(p.convoy_group);
            out.push({ kind: 'group', group: p.convoy_group, members: groupMembers(p.convoy_group) });
          }
        } else {
          out.push({ kind: 'item', pkg: p });
        }
      });
    return out;
  }

  const unscheduledUnits: Unit[] = useMemo(() => {
    const out: Unit[] = [];
    const seen = new Set<string>();
    packages.filter((p) => !p.planned_ship_date).forEach((p) => {
      if (p.convoy_group) {
        if (!seen.has(p.convoy_group)) {
          seen.add(p.convoy_group);
          out.push({ kind: 'group', group: p.convoy_group, members: groupMembers(p.convoy_group) });
        }
      } else {
        out.push({ kind: 'item', pkg: p });
      }
    });
    return out;
  }, [packages, groupMembers]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 5000);
  }

  async function persistDate(id: string, iso: string | null, prev: string | null) {
    try {
      const res = await fetch(`/api/schedule/packages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planned_ship_date: iso }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Save failed (${res.status})`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`Save failed: ${msg}. Reverting.`);
      setPackages((prevPkgs) => prevPkgs.map((p) => (p.id === id ? { ...p, planned_ship_date: prev } : p)));
    }
  }

  async function updateRts(pkgId: string, newRts: string | null) {
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) return;
    if (newRts === (pkg.rts_date ?? null)) return;
    const prev = pkg.rts_date;
    setPackages((prevPkgs) => prevPkgs.map((p) => (p.id === pkgId ? { ...p, rts_date: newRts } : p)));
    try {
      const res = await fetch(`/api/schedule/packages/${pkgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rts_date: newRts }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Save failed (${res.status})`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`RTS save failed: ${msg}. Reverting.`);
      setPackages((prevPkgs) => prevPkgs.map((p) => (p.id === pkgId ? { ...p, rts_date: prev } : p)));
    }
  }

  function updateShipFromTable(pkgId: string, newShip: string | null) {
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) return;
    if (newShip === (pkg.planned_ship_date ?? null)) return;
    moveItem(pkg, newShip);
  }

  function moveItem(pkg: SchedulePackage, targetISO: string | null) {
    if (targetISO && pkg.rts_date && targetISO < pkg.rts_date) {
      showToast(
        `${pkg.tag} can't ship on ${prettyDate(targetISO)}.\nReady to Ship is ${prettyDate(pkg.rts_date)}, so that's the earliest it can leave.`
      );
      return;
    }
    const prev = pkg.planned_ship_date;
    setPackages((prevPkgs) => prevPkgs.map((p) => (p.id === pkg.id ? { ...p, planned_ship_date: targetISO } : p)));
    persistDate(pkg.id, targetISO, prev);
  }

  function moveGroup(group: string, targetISO: string | null) {
    const floor = groupRTS(group);
    if (targetISO && floor && targetISO < floor) {
      showToast(
        `Convoy can't ship on ${prettyDate(targetISO)}.\nThe earliest all members are ready to ship together is ${prettyDate(floor)}.`
      );
      return;
    }
    const members = groupMembers(group);
    const prevMap = new Map(members.map((m) => [m.id, m.planned_ship_date]));
    setPackages((prevPkgs) =>
      prevPkgs.map((p) => (p.convoy_group === group ? { ...p, planned_ship_date: targetISO } : p))
    );
    members.forEach((m) => {
      persistDate(m.id, targetISO, prevMap.get(m.id) ?? null);
    });
  }

  const walkdownsByDate = useMemo(() => {
    const m = new Map<string, ScheduleWalkdown[]>();
    walkdowns.forEach((w) => {
      const arr = m.get(w.event_date) || [];
      arr.push(w);
      m.set(w.event_date, arr);
    });
    return m;
  }, [walkdowns]);

  async function saveWalkdown(state: WalkdownModalState) {
    const trimmedName = state.name.trim();
    if (!trimmedName) {
      showToast('Walk-down name is required.');
      return;
    }
    if (state.mode === 'create') {
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: ScheduleWalkdown = { id: tempId, event_date: state.date, level: state.level, name: trimmedName };
      setWalkdowns((prev) => [...prev, optimistic]);
      setWalkdownModal(null);
      try {
        const res = await fetch('/api/schedule/walkdowns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_date: state.date, level: state.level, name: trimmedName }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Save failed (${res.status})`);
        }
        const { walkdown } = await res.json();
        setWalkdowns((prev) => prev.map((w) => (w.id === tempId ? walkdown : w)));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        showToast(`Walk-down save failed: ${msg}`);
        setWalkdowns((prev) => prev.filter((w) => w.id !== tempId));
      }
    } else if (state.id) {
      const prevList = walkdowns;
      const editId = state.id;
      setWalkdowns((prev) => prev.map((w) => (w.id === editId ? { ...w, level: state.level, name: trimmedName } : w)));
      setWalkdownModal(null);
      try {
        const res = await fetch(`/api/schedule/walkdowns/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level: state.level, name: trimmedName }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Save failed (${res.status})`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        showToast(`Walk-down save failed: ${msg}`);
        setWalkdowns(prevList);
      }
    }
  }

  async function deleteWalkdown(id: string) {
    const prevList = walkdowns;
    setWalkdowns((prev) => prev.filter((w) => w.id !== id));
    setWalkdownModal(null);
    try {
      const res = await fetch(`/api/schedule/walkdowns/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Delete failed (${res.status})`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`Walk-down delete failed: ${msg}`);
      setWalkdowns(prevList);
    }
  }

  function openCreateWalkdown(date: string) {
    setWalkdownModal({ mode: 'create', date, level: 30, name: '' });
  }

  function openEditWalkdown(wd: ScheduleWalkdown) {
    setWalkdownModal({ mode: 'edit', id: wd.id, date: wd.event_date, level: wd.level, name: wd.name });
  }

  useEffect(() => {
    const wrap = calWrapRef.current;
    if (!wrap) return;
    const update = () => {
      const top = wrap.scrollTop;
      const bottom = top + wrap.clientHeight;
      const s = new Set<string>();
      wrap.querySelectorAll<HTMLElement>('.month-block').forEach((b) => {
        const t = b.offsetTop;
        const h = b.offsetHeight;
        if (t + h > top + 46 && t < bottom) {
          const ym = b.dataset.ym;
          if (ym) s.add(ym);
        }
      });
      setVisibleYMs(s);
    };
    update();
    wrap.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      wrap.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [monthRange]);

  const scheduledCount = packages.filter((p) => p.planned_ship_date).length;
  const overHeightCount = packages.filter((p) => p.is_over_height).length;
  const unscheduledCount = packages.length - scheduledCount;

  const visibleScheduledRows = useMemo(() => {
    return packages
      .filter((p) => p.planned_ship_date && visibleYMs.has(p.planned_ship_date.slice(0, 7)))
      .sort((a, b) =>
        (a.planned_ship_date ?? '').localeCompare(b.planned_ship_date ?? '') || a.tag.localeCompare(b.tag)
      );
  }, [packages, visibleYMs]);

  function jumpTo(ym: string) {
    const target = document.getElementById(`mb-${ym}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function goToday() {
    const t = new Date();
    jumpTo(keyYM(t.getFullYear(), t.getMonth()));
  }

  function openPrintModal() {
    const yms = monthRange.map(([y, m]) => keyYM(y, m));
    if (yms.length === 0) return;
    const defaultFrom = yms.includes('2026-07') ? '2026-07' : yms[0];
    const defaultTo = yms.includes('2026-09') ? '2026-09' : yms[Math.min(2, yms.length - 1)];
    setPrintModal({ from: defaultFrom, to: defaultTo });
  }

  function doPrint() {
    if (!printModal) return;
    const yms = monthRange.map(([y, m]) => keyYM(y, m));
    const fi = yms.indexOf(printModal.from);
    const ti = yms.indexOf(printModal.to);
    if (fi < 0 || ti < 0) return;
    const [lo, hi] = fi <= ti ? [fi, ti] : [ti, fi];
    setPrintRange({ from: yms[lo], to: yms[hi] });
    setPrintModal(null);
    setTimeout(() => window.print(), 100);
  }

  return (
    <SearchContext.Provider value={{ term: searchTerm, currentMatchId }}>
    <div className="schedule-root flex h-full w-full text-[13px] leading-snug">
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          title="Show side panel"
          aria-label="Show side panel"
          className="schedule-toggle-rail w-7 shrink-0 bg-white border-r border-black/15 hover:bg-black/[0.03] flex items-center justify-center text-enbridge-black/50 hover:text-enbridge-black"
        >
          <span className="rotate-90 text-[10px] uppercase tracking-widest whitespace-nowrap">▸ Side panel</span>
        </button>
      )}
      <aside
        className={`schedule-side bg-white border-r border-black/15 flex flex-col overflow-hidden transition-all ${
          panelOpen ? 'w-[420px] min-w-[420px]' : 'w-0 min-w-0 border-r-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="px-4 pt-3 pb-2 border-b border-black/10 flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-enbridge-black/55 font-semibold">On screen now</div>
            <div className="text-xs font-semibold">
            {visibleYMs.size === 0 ? '—' : (
              <>
                {(() => {
                  const yms = [...visibleYMs].sort();
                  const fmt = (s: string) => `${MONTHS_SHORT[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`;
                  const lbl = yms.length === 1 ? fmt(yms[0]) : `${fmt(yms[0])} – ${fmt(yms[yms.length - 1])}`;
                  return (
                    <>
                      {lbl} <span className="text-enbridge-black/55 font-normal">· {visibleScheduledRows.length} package{visibleScheduledRows.length === 1 ? '' : 's'}</span>
                    </>
                  );
                })()}
              </>
            )}
          </div>
          </div>
          <button
            onClick={() => setPanelOpen(false)}
            title="Hide side panel to expand calendar"
            aria-label="Hide side panel"
            className="shrink-0 text-enbridge-black/40 hover:text-enbridge-black/70 text-sm leading-none px-1 py-0.5 rounded hover:bg-black/[0.05]"
          >
            ◂
          </button>
        </div>

        <details className="border-b border-black/10" open={unscheduledCount > 0}>
          <summary className="cursor-pointer list-none px-4 py-2 text-[11px] uppercase tracking-wide text-enbridge-black/55 font-semibold flex items-center gap-2">
            <span>Unscheduled</span>
            <span className="inline-block bg-black/5 text-enbridge-black/60 rounded-full px-2 text-[10px]">{unscheduledCount}</span>
          </summary>
          <div className="text-[10.5px] text-enbridge-black/55 px-4 pb-2">Drag any of these onto a date. Drag a scheduled item back here to unschedule.</div>
          <div
            className="max-h-[230px] overflow-y-auto px-3 pb-2 space-y-1.5"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const data = e.dataTransfer.getData('text/plain');
              if (data.startsWith('grp:')) moveGroup(data.slice(4), null);
              else {
                const id = data.replace(/^it:/, '');
                const pkg = packages.find((p) => p.id === id);
                if (pkg) moveItem(pkg, null);
              }
            }}
          >
            {unscheduledUnits.length === 0 ? (
              <div className="text-[10.5px] text-enbridge-black/55 italic px-1">Everything is scheduled.</div>
            ) : (
              unscheduledUnits.map((u) =>
                u.kind === 'item' ? (
                  <Chip key={u.pkg.id} pkg={u.pkg} inTray onDragStart={(id) => { setDragId(id); setDragGroup(null); }} onDragEnd={() => { setDragId(null); setDragGroup(null); }} />
                ) : (
                  <GroupChip key={u.group} group={u.group} members={u.members} inTray onDragStart={(g) => { setDragGroup(g); setDragId(null); }} onDragEnd={() => { setDragId(null); setDragGroup(null); }} />
                )
              )
            )}
          </div>
        </details>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr>
                <th className="sticky top-0 bg-[#f7f8fa] z-10 text-left text-[10px] uppercase tracking-wide text-enbridge-black/55 font-bold px-2 py-1.5 border-b border-black/15">Package</th>
                <th className="sticky top-0 bg-[#f7f8fa] z-10 text-left text-[10px] uppercase tracking-wide text-enbridge-black/55 font-bold px-2 py-1.5 border-b border-black/15">RTS</th>
                <th className="sticky top-0 bg-[#f7f8fa] z-10 text-left text-[10px] uppercase tracking-wide text-enbridge-black/55 font-bold px-2 py-1.5 border-b border-black/15">Ship</th>
                <th className="sticky top-0 bg-[#f7f8fa] z-10 text-left text-[10px] uppercase tracking-wide text-enbridge-black/55 font-bold px-2 py-1.5 border-b border-black/15">Arrival</th>
              </tr>
            </thead>
            <tbody>
              {visibleScheduledRows.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-enbridge-black/55 italic py-6 text-xs">No scheduled packages in view.</td></tr>
              ) : (
                (() => {
                  const rows: ReactNode[] = [];
                  let lastMonth = '';
                  visibleScheduledRows.forEach((p) => {
                    const mk = p.planned_ship_date!.slice(0, 7);
                    if (mk !== lastMonth) {
                      lastMonth = mk;
                      rows.push(
                        <tr key={`sep-${mk}`}>
                          <td colSpan={4} className="bg-black/5 font-bold text-[10px] uppercase tracking-wider text-enbridge-black/55 px-2 py-1">
                            {MONTHS[+mk.slice(5, 7) - 1]} {mk.slice(0, 4)}
                          </td>
                        </tr>
                      );
                    }
                    rows.push(
                      <tr key={p.id} className="border-b border-black/5 hover:bg-black/[0.02]">
                        <td className={`px-2 py-1.5 align-top font-bold ${p.is_rack ? 'text-[#1F4E79]' : 'text-[#9c4f12]'}`}>
                          <span className={`inline-block w-2 h-2 rounded-[2px] mr-1.5 align-middle ${p.is_rack ? 'bg-[#1F4E79]' : 'bg-[#C2691C]'}`} />
                          <Highlight text={p.tag} />
                          {p.is_over_height && <span className="ml-1 bg-black text-[#f5ff00] text-[9px] font-bold px-1 rounded">OH</span>}
                          {p.convoy_group && <span className="ml-1 text-enbridge-black/55">⊕</span>}
                        </td>
                        <td className="px-2 py-1.5 align-top whitespace-nowrap tabular-nums text-enbridge-black/80">
                          <EditableDate value={p.rts_date} onSave={(v) => updateRts(p.id, v)} />
                        </td>
                        <td className="px-2 py-1.5 align-top whitespace-nowrap tabular-nums text-enbridge-black/80">
                          <EditableDate value={p.planned_ship_date} onSave={(v) => updateShipFromTable(p.id, v)} />
                        </td>
                        <td className="px-2 py-1.5 align-top whitespace-nowrap tabular-nums font-semibold text-enbridge-black/70">{prettyDate(p.planned_ship_date ? isoAdd(p.planned_ship_date, 2) : null)}</td>
                      </tr>
                    );
                  });
                  return rows;
                })()
              )}
            </tbody>
          </table>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="schedule-toolbar bg-white border-b border-black/15 px-5 py-3 flex items-center gap-4 flex-wrap">
          <div className="h-6 w-1 bg-[#D04E00] rounded-sm" />
          <div className="flex flex-col">
            <span className="font-bold text-[15px]">ACGS Ship Schedule — Aitken Creek</span>
            <span className="text-[11px] text-enbridge-black/55">Planned Ship date · Foremost tanks convoy together · yellow = over-height &gt; 13 ft</span>
          </div>
          <div className="flex gap-1.5 items-center">
            <button
              onClick={() => setShowPackages((v) => !v)}
              title="Toggle Packages layer"
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors font-medium ${
                showPackages
                  ? 'bg-[#1F4E79] text-white border-[#1F4E79]'
                  : 'bg-white text-enbridge-black/60 border-black/20 hover:bg-black/[0.03]'
              }`}
            >
              {showPackages ? '● ' : '○ '}Packages
            </button>
            <button
              onClick={() => setShowWalkdowns((v) => !v)}
              title="Toggle Walk-downs layer"
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors font-medium ${
                showWalkdowns
                  ? 'bg-[#3f9142] text-white border-[#3f9142]'
                  : 'bg-white text-enbridge-black/60 border-black/20 hover:bg-black/[0.03]'
              }`}
            >
              {showWalkdowns ? '● ' : '○ '}Walk-downs
            </button>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <label className="text-[11px] text-enbridge-black/55">Jump to</label>
            <select
              onChange={(e) => e.target.value && jumpTo(e.target.value)}
              className="text-xs px-2 py-1.5 border border-black/15 rounded bg-white"
            >
              <option value="">—</option>
              {monthRange.map(([y, m]) => (
                <option key={keyYM(y, m)} value={keyYM(y, m)}>{MONTHS[m]} {y}</option>
              ))}
            </select>
            <button onClick={goToday} className="text-xs px-3 py-1.5 border border-black/15 rounded bg-white hover:bg-black/[0.03]">Today</button>
            <div className="flex items-center gap-1 border border-black/15 rounded bg-white px-1.5 py-0.5">
              <span className="text-enbridge-black/40 text-xs">🔎</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search…"
                className="text-xs bg-transparent border-none focus:outline-none w-28 py-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.shiftKey ? prevMatch() : nextMatch();
                  else if (e.key === 'Escape') setSearchTerm('');
                }}
              />
              {searchTerm && (
                <>
                  <span className="text-[10px] text-enbridge-black/55 tabular-nums whitespace-nowrap">
                    {searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : '0'}
                  </span>
                  <button
                    onClick={prevMatch}
                    disabled={searchMatches.length === 0}
                    title="Previous match (Shift+Enter)"
                    className="text-[10px] px-1 text-enbridge-black/60 hover:text-enbridge-black disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={nextMatch}
                    disabled={searchMatches.length === 0}
                    title="Next match (Enter)"
                    className="text-[10px] px-1 text-enbridge-black/60 hover:text-enbridge-black disabled:opacity-30"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => setSearchTerm('')}
                    title="Clear search (Escape)"
                    className="text-[10px] px-1 text-enbridge-black/60 hover:text-enbridge-black"
                  >
                    ×
                  </button>
                </>
              )}
            </div>
            <button
              onClick={openPrintModal}
              title="Print calendar to PDF (one month per landscape page)"
              className="text-xs px-3 py-1.5 border border-black/15 rounded bg-white hover:bg-black/[0.03]"
            >
              🖨 Print…
            </button>
          </div>
        </div>

        <div ref={calWrapRef} className="schedule-cal-wrap flex-1 overflow-auto px-4 pb-10">
          <div className="schedule-weekdays sticky top-0 z-[5] bg-[#f3f4f6] pt-3">
            <div className="grid grid-cols-7 gap-1.5 pb-1.5">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                <div key={d} className="text-[11px] uppercase tracking-wider text-enbridge-black/55 font-semibold px-1.5 py-0.5">{d}</div>
              ))}
            </div>
          </div>
          <div className="schedule-months">
            {monthRange.map(([y, m]) => {
              const ym = keyYM(y, m);
              const monthPackages = packages.filter((p) => p.planned_ship_date && p.planned_ship_date.slice(0, 7) === ym).length;
              const first = new Date(y, m, 1);
              const start = new Date(first);
              start.setDate(1 - first.getDay());
              const last = new Date(y, m + 1, 0);
              const cells = Math.ceil((first.getDay() + last.getDate()) / 7) * 7;
              const nrows = cells / 7;
              const days: Date[] = [];
              for (let i = 0; i < cells; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                days.push(d);
              }
              const isSkip = printRange && (ym < printRange.from || ym > printRange.to);
              const isLast = printRange && ym === printRange.to;
              return (
                <div
                  key={ym}
                  className={`month-block mb-3 ${isSkip ? 'print-skip' : ''} ${isLast ? 'print-last' : ''}`}
                  id={`mb-${ym}`}
                  data-ym={ym}
                >
                  <div className="schedule-month-head sticky top-[38px] z-[4] bg-gradient-to-b from-[#f3f4f6] to-[#f3f4f6]/0 py-2 flex items-baseline gap-2.5">
                    <span className="mname text-base font-bold">{MONTHS[m]}</span>
                    <span className="myear text-xs text-enbridge-black/55 font-semibold">{y}</span>
                    <span className="text-[11px] text-enbridge-black/55 ml-auto">{monthPackages ? `${monthPackages} shipping` : ''}</span>
                  </div>
                  <div className="schedule-print-weekdays hidden">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                      <div key={d}>{d}</div>
                    ))}
                  </div>
                  <div
                    className="schedule-grid grid grid-cols-7 gap-1.5 auto-rows-[minmax(116px,auto)]"
                    style={{ '--rows': String(nrows), '--rowh': nrows >= 6 ? '1.05in' : '1.28in' } as React.CSSProperties}
                  >
                    {days.map((d, i) => {
                      const iso = d.toISOString().slice(0, 10);
                      const outOfMonth = d.getMonth() !== m;
                      if (outOfMonth) return <div key={i} className="border-0" />;
                      const units = unitsForDate(iso);
                      const dayWalkdowns = walkdownsByDate.get(iso) || [];
                      return (
                        <Cell
                          key={i}
                          dateISO={iso}
                          dayNum={d.getDate()}
                          units={units}
                          walkdowns={dayWalkdowns}
                          showPackages={showPackages}
                          showWalkdowns={showWalkdowns}
                          floorForDrag={() => {
                            if (dragGroup) return groupRTS(dragGroup);
                            if (dragId) {
                              const it = packages.find((x) => x.id === dragId);
                              return it?.rts_date ?? null;
                            }
                            return null;
                          }}
                          onDropItem={(id, target) => {
                            const pkg = packages.find((p) => p.id === id);
                            if (pkg) moveItem(pkg, target);
                          }}
                          onDropGroup={(g, target) => moveGroup(g, target)}
                          onChipDragStart={(id) => { setDragId(id); setDragGroup(null); }}
                          onGroupDragStart={(g) => { setDragGroup(g); setDragId(null); }}
                          onDragEnd={() => { setDragId(null); setDragGroup(null); }}
                          onCreateWalkdown={openCreateWalkdown}
                          onEditWalkdown={openEditWalkdown}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="schedule-footer bg-white border-t border-black/10 px-5 py-2 text-[11px] text-enbridge-black/70 flex items-center justify-between gap-4 flex-wrap">
          <span>
            <strong>{scheduledCount}</strong> scheduled ·{' '}
            <strong>{unscheduledCount}</strong> unscheduled ·{' '}
            <strong>{packages.length}</strong> total ·{' '}
            <strong className="bg-[#f5ff00] text-black px-1.5 py-0.5 rounded">{overHeightCount}</strong> over-height ·{' '}
            <strong className="text-[#3f9142]">{walkdowns.length}</strong> walk-down{walkdowns.length === 1 ? '' : 's'}
          </span>
          <span className="text-enbridge-black/50 italic">
            Changes save automatically. Click a day (when Walk-downs layer is on) to add a milestone.
          </span>
        </div>
      </div>

      {toast && (
        <div className="schedule-toast fixed left-1/2 bottom-6 -translate-x-1/2 bg-[#2b2f33] text-white px-4 py-3 rounded-lg max-w-md shadow-xl text-xs flex gap-3 z-50 border-l-4 border-[#D04E00] whitespace-pre-line">
          <span className="text-[#D04E00] text-base leading-none">⚠</span>
          <span>{toast}</span>
        </div>
      )}

      {walkdownModal && (
        <WalkdownModal
          state={walkdownModal}
          onChange={setWalkdownModal}
          onCancel={() => setWalkdownModal(null)}
          onSave={() => saveWalkdown(walkdownModal)}
          onDelete={walkdownModal.mode === 'edit' && walkdownModal.id ? () => deleteWalkdown(walkdownModal.id!) : undefined}
        />
      )}

      {printModal && (
        <PrintModal
          monthRange={monthRange}
          state={printModal}
          onChange={setPrintModal}
          onCancel={() => setPrintModal(null)}
          onPrint={doPrint}
        />
      )}
    </div>
    </SearchContext.Provider>
  );
}

function PrintModal({
  monthRange, state, onChange, onCancel, onPrint,
}: {
  monthRange: [number, number][];
  state: { from: string; to: string };
  onChange: (next: { from: string; to: string }) => void;
  onCancel: () => void;
  onPrint: () => void;
}) {
  const yms = monthRange.map(([y, m]) => keyYM(y, m));
  const label = (k: string) => `${MONTHS[+k.slice(5, 7) - 1]} ${k.slice(0, 4)}`;
  const fi = yms.indexOf(state.from);
  const ti = yms.indexOf(state.to);
  const [lo, hi] = fi >= 0 && ti >= 0 ? (fi <= ti ? [fi, ti] : [ti, fi]) : [-1, -1];
  const pageCount = lo >= 0 ? hi - lo + 1 : 0;

  return (
    <div
      className="schedule-print-modal fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-black/10">
          <h3 className="text-sm font-semibold">Print calendar</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-enbridge-black/60 leading-snug">
            Choose the month range to print. Each month prints on its own 8.5×11 landscape page.
          </p>
          <div className="grid grid-cols-[auto,1fr] gap-2 items-center">
            <label className="text-xs font-medium text-enbridge-black/70">From</label>
            <select
              value={state.from}
              onChange={(e) => onChange({ ...state, from: e.target.value })}
              className="rounded border border-black/20 px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-enbridge-black"
            >
              {yms.map((k) => (
                <option key={k} value={k}>{label(k)}</option>
              ))}
            </select>
            <label className="text-xs font-medium text-enbridge-black/70">To</label>
            <select
              value={state.to}
              onChange={(e) => onChange({ ...state, to: e.target.value })}
              className="rounded border border-black/20 px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-enbridge-black"
            >
              {yms.map((k) => (
                <option key={k} value={k}>{label(k)}</option>
              ))}
            </select>
          </div>
          <div className="text-[11px] text-enbridge-black/55">
            {pageCount > 0 ? `${pageCount} page${pageCount === 1 ? '' : 's'} will print.` : ''}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-black/10 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs rounded border border-black/15 hover:bg-enbridge-paper"
          >
            Cancel
          </button>
          <button
            onClick={onPrint}
            disabled={pageCount === 0}
            className="px-3 py-1.5 text-xs rounded bg-[#D04E00] text-white hover:bg-[#b84500] disabled:opacity-50 font-semibold"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

function EditableDate({
  value, onSave,
}: {
  value: string | null;
  onSave: (v: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value ?? '');

  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  function commit() {
    setEditing(false);
    const next = draft || null;
    if (next !== (value ?? null)) onSave(next);
  }

  function cancel() {
    setEditing(false);
    setDraft(value ?? '');
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        title="Click to edit"
        className="text-left rounded px-1 py-0.5 hover:bg-black/[0.04] hover:ring-1 hover:ring-black/10 tabular-nums min-w-[80px]"
      >
        {prettyDate(value)}
      </button>
    );
  }

  return (
    <input
      type="date"
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        else if (e.key === 'Escape') cancel();
      }}
      className="rounded border border-enbridge-black px-1 py-0.5 text-[11px] w-[120px] bg-white focus:outline-none"
    />
  );
}

function WalkdownChip({ wd, onClick }: { wd: ScheduleWalkdown; onClick: () => void }) {
  const { currentMatchId } = useContext(SearchContext);
  const searchId = `wd-${wd.id}`;
  const isCurrent = isCurrentMatch(searchId, currentMatchId);
  const s = WD_STYLES[wd.level];
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      data-search-id={searchId}
      className={`w-full text-left rounded border ${s.bg} ${s.text} ${s.border} px-1.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 hover:brightness-95 ${isCurrent ? 'ring-2 ring-purple-500 ring-offset-1' : ''}`}
      title={`${wd.level}% walk-down · click to edit`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.solid}`} />
      <span className="truncate">{wd.level}% · <Highlight text={wd.name} /></span>
    </button>
  );
}

function WalkdownModal({
  state, onChange, onCancel, onSave, onDelete,
}: {
  state: WalkdownModalState;
  onChange: (next: WalkdownModalState) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className="schedule-walkdown-modal fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-black/10">
          <h3 className="text-sm font-semibold">
            {state.mode === 'create' ? 'Add walk-down' : 'Edit walk-down'}
          </h3>
          <div className="text-[11px] text-enbridge-black/55 mt-0.5">{prettyDate(state.date)}</div>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-enbridge-black/70 uppercase tracking-wide mb-1.5">Level</label>
            <div className="flex gap-1.5">
              {[30, 60, 90].map((lvl) => {
                const s = WD_STYLES[lvl as WalkdownLevel];
                const active = state.level === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => onChange({ ...state, level: lvl as WalkdownLevel })}
                    className={`flex-1 text-xs rounded border py-2 font-semibold transition-colors ${
                      active
                        ? `${s.bg} ${s.text} ${s.border} ring-2 ring-offset-1 ring-black/20`
                        : 'bg-white border-black/15 text-enbridge-black/50 hover:bg-black/[0.03]'
                    }`}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${s.solid} mr-1 align-middle`} />
                    {lvl}%
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label htmlFor="wd-name" className="block text-[11px] font-medium text-enbridge-black/70 uppercase tracking-wide mb-1.5">Name</label>
            <input
              id="wd-name"
              type="text"
              autoFocus
              value={state.name}
              onChange={(e) => onChange({ ...state, name: e.target.value })}
              placeholder="e.g. Refrigeration package"
              className="w-full rounded border border-black/20 px-3 py-2 text-sm focus:outline-none focus:border-enbridge-black"
              onKeyDown={(e) => { if (e.key === 'Enter' && state.name.trim()) onSave(); }}
            />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-black/10 flex items-center justify-between gap-2">
          {onDelete ? (
            <button
              onClick={onDelete}
              className="text-xs text-red-700 hover:text-red-900 underline"
            >
              Delete
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs rounded border border-black/15 hover:bg-enbridge-paper"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={!state.name.trim()}
              className="px-3 py-1.5 text-xs rounded bg-enbridge-black text-white hover:bg-enbridge-black/90 disabled:opacity-50 font-semibold"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({
  pkg, inTray, onDragStart, onDragEnd,
}: {
  pkg: SchedulePackage;
  inTray: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const { currentMatchId } = useContext(SearchContext);
  const searchId = `pkg-${pkg.id}`;
  const isCurrent = isCurrentMatch(searchId, currentMatchId);
  const cls = pkg.is_rack ? 'bg-[#E8EFF6] border-[#c2d4e6]' : 'bg-[#FBEEE0] border-[#ecd2b3]';
  const barCls = pkg.is_rack ? 'bg-[#1F4E79]' : 'bg-[#C2691C]';
  const tagCls = pkg.is_rack ? 'text-[#1F4E79]' : 'text-[#9c4f12]';
  const overCls = pkg.is_over_height ? '!bg-[#f5ff00] !border-[#c9d400]' : '';
  const ringCls = isCurrent ? 'ring-2 ring-purple-500 ring-offset-1' : '';
  const dims = pkg.length_ft != null ? `${pkg.length_ft}×${pkg.width_ft}×${pkg.height_ft} ft` : '—';
  const wt = pkg.weight_lbs ? fmtWeight(pkg.weight_lbs) : '';
  return (
    <div
      draggable
      data-search-id={searchId}
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', `it:${pkg.id}`); onDragStart(pkg.id); }}
      onDragEnd={onDragEnd}
      className={`chip relative rounded-md border cursor-grab active:cursor-grabbing px-2 py-1 pl-2.5 text-[11px] select-none ${cls} ${overCls} ${ringCls}`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md ${pkg.is_over_height ? 'bg-black' : barCls}`} />
      <div className={`font-bold ${pkg.is_over_height ? 'text-black' : tagCls}`}>
        <Highlight text={pkg.tag} />
        {pkg.is_over_height && (
          <span className="ml-1.5 bg-black text-[#f5ff00] text-[9px] font-bold px-1 rounded align-middle">
            OVER-HT {pkg.height_ft}′
          </span>
        )}
      </div>
      <div className={`text-[10px] mt-0.5 ${pkg.is_over_height ? 'text-[#3d4400]' : 'text-enbridge-black/55'}`}>
        {inTray ? <><Highlight text={pkg.ewp} /> · </> : ''}{dims}{wt ? ` · ${wt}` : ''}
      </div>
    </div>
  );
}

function GroupChip({
  group, members, inTray, onDragStart, onDragEnd,
}: {
  group: string;
  members: SchedulePackage[];
  inTray: boolean;
  onDragStart: (g: string) => void;
  onDragEnd: () => void;
}) {
  const { currentMatchId } = useContext(SearchContext);
  const searchId = `group-${group}`;
  const isCurrent = isCurrentMatch(searchId, currentMatchId);
  const anyRack = members.some((m) => m.is_rack);
  const anyOver = members.some((m) => m.is_over_height);
  const cls = anyRack ? 'bg-[#E8EFF6] border-[#c2d4e6]' : 'bg-[#FBEEE0] border-[#ecd2b3]';
  const overCls = anyOver ? '!bg-[#f5ff00] !border-[#c9d400]' : '';
  const ringCls = isCurrent ? 'ring-2 ring-purple-500 ring-offset-1' : '';
  const gname = GROUP_LABELS[group] ?? group;
  return (
    <div
      draggable
      data-search-id={searchId}
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', `grp:${group}`); onDragStart(group); }}
      onDragEnd={onDragEnd}
      className={`chip relative rounded-md border cursor-grab active:cursor-grabbing px-2 py-1 pl-2.5 text-[11px] select-none ${cls} ${overCls} ${ringCls}`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md ${anyOver ? 'bg-black' : (anyRack ? 'bg-[#1F4E79]' : 'bg-[#C2691C]')}`} />
      <div className="flex items-center justify-between gap-1.5">
        <span className={`font-bold ${anyOver ? 'text-black' : (anyRack ? 'text-[#1F4E79]' : 'text-[#9c4f12]')}`}>
          <Highlight text={gname} />
          {anyOver && <span className="ml-1.5 bg-black text-[#f5ff00] text-[9px] font-bold px-1 rounded">OVER-HT {members[0].height_ft}′</span>}
        </span>
        <span className="text-[9px] text-enbridge-black/55 font-semibold bg-black/5 rounded-full px-1.5 py-0.5">{members.length} loads · 1 convoy</span>
      </div>
      <div className="text-[10px] text-enbridge-black/55 mt-0.5">{inTray ? <><Highlight text={members[0].ewp} /> · </> : ''}Ships together same day</div>
      <div className="mt-1 flex flex-col gap-0.5">
        {members.map((m) => (
          <div key={m.id} className="text-[10px] px-1.5 py-0.5 bg-white/60 rounded border border-black/5 flex justify-between gap-1.5">
            <span><Highlight text={m.tag.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim()} /></span>
            <span className="text-enbridge-black/55 tabular-nums">{m.height_ft}′ · {fmtWeight(m.weight_lbs)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Cell({
  dateISO, dayNum, units, walkdowns, showPackages, showWalkdowns, floorForDrag,
  onDropItem, onDropGroup, onChipDragStart, onGroupDragStart, onDragEnd,
  onCreateWalkdown, onEditWalkdown,
}: {
  dateISO: string;
  dayNum: number;
  units: Unit[];
  walkdowns: ScheduleWalkdown[];
  showPackages: boolean;
  showWalkdowns: boolean;
  floorForDrag: () => string | null;
  onDropItem: (id: string, target: string) => void;
  onDropGroup: (g: string, target: string) => void;
  onChipDragStart: (id: string) => void;
  onGroupDragStart: (g: string) => void;
  onDragEnd: () => void;
  onCreateWalkdown: (date: string) => void;
  onEditWalkdown: (wd: ScheduleWalkdown) => void;
}) {
  const [drag, setDrag] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const packageCount = showPackages ? units.length : 0;
  const walkdownCount = showWalkdowns ? walkdowns.length : 0;
  const badgeCount = packageCount + walkdownCount;
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        const f = floorForDrag();
        setDrag(f && dateISO < f ? 'invalid' : 'valid');
      }}
      onDragLeave={() => setDrag('idle')}
      onDrop={(e) => {
        e.preventDefault();
        setDrag('idle');
        const data = e.dataTransfer.getData('text/plain');
        if (data.startsWith('grp:')) onDropGroup(data.slice(4), dateISO);
        else onDropItem(data.replace(/^it:/, ''), dateISO);
      }}
      className={`schedule-cell bg-white border rounded-lg p-1.5 flex flex-col min-h-[116px] transition-colors
        ${drag === 'invalid' ? 'bg-[#fdeceb] border-[#c0392b] border-dashed' : ''}
        ${drag === 'valid' ? 'bg-[#eef6ee] border-[#3f9142] border-dashed' : 'border-black/10'}
      `}
    >
      <div className="daynum text-[11px] text-enbridge-black/55 font-semibold flex justify-between px-1 pt-0.5 pb-1">
        <span>{dayNum}</span>
        {badgeCount > 0 && <span className="text-[10px]">{badgeCount}</span>}
      </div>
      <div className="flex flex-col gap-1">
        {showWalkdowns && walkdowns.map((wd) => (
          <WalkdownChip key={wd.id} wd={wd} onClick={() => onEditWalkdown(wd)} />
        ))}
        {showPackages && units.map((u) =>
          u.kind === 'item' ? (
            <Chip key={u.pkg.id} pkg={u.pkg} inTray={false} onDragStart={onChipDragStart} onDragEnd={onDragEnd} />
          ) : (
            <GroupChip key={u.group} group={u.group} members={u.members} inTray={false} onDragStart={onGroupDragStart} onDragEnd={onDragEnd} />
          )
        )}
        {showWalkdowns && (
          <button
            onClick={() => onCreateWalkdown(dateISO)}
            className="schedule-add-walkdown mt-0.5 text-[10px] text-enbridge-black/40 hover:text-[#3f9142] hover:bg-green-50 rounded py-0.5 border border-dashed border-transparent hover:border-green-300 transition-colors"
            title="Add a walk-down milestone on this day"
          >
            + Walk-down
          </button>
        )}
      </div>
    </div>
  );
}
