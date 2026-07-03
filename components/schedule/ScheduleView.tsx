'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SchedulePackage } from '@/types/schedule';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

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

export function ScheduleView({ initialPackages }: { initialPackages: SchedulePackage[] }) {
  const [packages, setPackages] = useState<SchedulePackage[]>(initialPackages);
  const [toast, setToast] = useState<string>('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragGroup, setDragGroup] = useState<string | null>(null);
  const calWrapRef = useRef<HTMLDivElement>(null);
  const [visibleYMs, setVisibleYMs] = useState<Set<string>>(new Set());

  useEffect(() => setPackages(initialPackages), [initialPackages]);

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

  return (
    <div className="flex h-full w-full text-[13px] leading-snug">
      <aside className="w-[420px] min-w-[420px] bg-white border-r border-black/15 flex flex-col overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-black/10">
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
                          {p.tag}
                          {p.is_over_height && <span className="ml-1 bg-black text-[#f5ff00] text-[9px] font-bold px-1 rounded">OH</span>}
                          {p.convoy_group && <span className="ml-1 text-enbridge-black/55">⊕</span>}
                        </td>
                        <td className="px-2 py-1.5 align-top whitespace-nowrap tabular-nums text-enbridge-black/80">{prettyDate(p.rts_date)}</td>
                        <td className="px-2 py-1.5 align-top whitespace-nowrap tabular-nums text-enbridge-black/80">{prettyDate(p.planned_ship_date)}</td>
                        <td className="px-2 py-1.5 align-top whitespace-nowrap tabular-nums font-semibold">{prettyDate(p.planned_ship_date ? isoAdd(p.planned_ship_date, 2) : null)}</td>
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
        <div className="bg-white border-b border-black/15 px-5 py-3 flex items-center gap-4 flex-wrap">
          <div className="h-6 w-1 bg-[#D04E00] rounded-sm" />
          <div className="flex flex-col">
            <span className="font-bold text-[15px]">ACGS Ship Schedule — Aitken Creek</span>
            <span className="text-[11px] text-enbridge-black/55">Planned Ship date · Foremost tanks convoy together · yellow = over-height &gt; 13 ft</span>
          </div>
          <div className="flex gap-3 items-center text-[11px] text-enbridge-black/55">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#1F4E79]" />Pipe Rack (EWP 8)</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#C2691C]" />Other EWP</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#f5ff00] border border-[#c9d400]" />Over-height &gt;13′</span>
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
          </div>
        </div>

        <div ref={calWrapRef} className="flex-1 overflow-auto px-4 pb-10">
          <div className="sticky top-0 z-[5] bg-[#f3f4f6] pt-3">
            <div className="grid grid-cols-7 gap-1.5 pb-1.5">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                <div key={d} className="text-[11px] uppercase tracking-wider text-enbridge-black/55 font-semibold px-1.5 py-0.5">{d}</div>
              ))}
            </div>
          </div>
          <div>
            {monthRange.map(([y, m]) => {
              const monthPackages = packages.filter((p) => p.planned_ship_date && p.planned_ship_date.slice(0, 7) === keyYM(y, m)).length;
              const first = new Date(y, m, 1);
              const start = new Date(first);
              start.setDate(1 - first.getDay());
              const last = new Date(y, m + 1, 0);
              const cells = Math.ceil((first.getDay() + last.getDate()) / 7) * 7;
              const days: Date[] = [];
              for (let i = 0; i < cells; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                days.push(d);
              }
              return (
                <div key={keyYM(y, m)} className="month-block mb-3" id={`mb-${keyYM(y, m)}`} data-ym={keyYM(y, m)}>
                  <div className="sticky top-[38px] z-[4] bg-gradient-to-b from-[#f3f4f6] to-[#f3f4f6]/0 py-2 flex items-baseline gap-2.5">
                    <span className="text-base font-bold">{MONTHS[m]}</span>
                    <span className="text-xs text-enbridge-black/55 font-semibold">{y}</span>
                    <span className="text-[11px] text-enbridge-black/55 ml-auto">{monthPackages ? `${monthPackages} shipping` : ''}</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 auto-rows-[minmax(116px,auto)]">
                    {days.map((d, i) => {
                      const iso = d.toISOString().slice(0, 10);
                      const outOfMonth = d.getMonth() !== m;
                      if (outOfMonth) return <div key={i} className="border-0" />;
                      const units = unitsForDate(iso);
                      return (
                        <Cell
                          key={i}
                          dateISO={iso}
                          dayNum={d.getDate()}
                          units={units}
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
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border-t border-black/10 px-5 py-2 text-[11px] text-enbridge-black/70 flex items-center justify-between">
          <span>
            <strong>{scheduledCount}</strong> scheduled ·{' '}
            <strong>{unscheduledCount}</strong> unscheduled ·{' '}
            <strong>{packages.length}</strong> total ·{' '}
            <strong className="bg-[#f5ff00] text-black px-1.5 py-0.5 rounded">{overHeightCount}</strong> over-height
          </span>
          <span className="text-enbridge-black/50 italic">
            Changes save automatically. Export / walkdowns / print / search coming in v2.
          </span>
        </div>
      </div>

      {toast && (
        <div className="fixed left-1/2 bottom-6 -translate-x-1/2 bg-[#2b2f33] text-white px-4 py-3 rounded-lg max-w-md shadow-xl text-xs flex gap-3 z-50 border-l-4 border-[#D04E00] whitespace-pre-line">
          <span className="text-[#D04E00] text-base leading-none">⚠</span>
          <span>{toast}</span>
        </div>
      )}
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
  const cls = pkg.is_rack ? 'bg-[#E8EFF6] border-[#c2d4e6]' : 'bg-[#FBEEE0] border-[#ecd2b3]';
  const barCls = pkg.is_rack ? 'bg-[#1F4E79]' : 'bg-[#C2691C]';
  const tagCls = pkg.is_rack ? 'text-[#1F4E79]' : 'text-[#9c4f12]';
  const overCls = pkg.is_over_height ? '!bg-[#f5ff00] !border-[#c9d400]' : '';
  const dims = pkg.length_ft != null ? `${pkg.length_ft}×${pkg.width_ft}×${pkg.height_ft} ft` : '—';
  const wt = pkg.weight_lbs ? fmtWeight(pkg.weight_lbs) : '';
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', `it:${pkg.id}`); onDragStart(pkg.id); }}
      onDragEnd={onDragEnd}
      className={`chip relative rounded-md border cursor-grab active:cursor-grabbing px-2 py-1 pl-2.5 text-[11px] select-none ${cls} ${overCls}`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md ${pkg.is_over_height ? 'bg-black' : barCls}`} />
      <div className={`font-bold ${pkg.is_over_height ? 'text-black' : tagCls}`}>
        {pkg.tag}
        {pkg.is_over_height && (
          <span className="ml-1.5 bg-black text-[#f5ff00] text-[9px] font-bold px-1 rounded align-middle">
            OVER-HT {pkg.height_ft}′
          </span>
        )}
      </div>
      <div className={`text-[10px] mt-0.5 ${pkg.is_over_height ? 'text-[#3d4400]' : 'text-enbridge-black/55'}`}>
        {inTray ? `${pkg.ewp} · ` : ''}{dims}{wt ? ` · ${wt}` : ''}
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
  const anyRack = members.some((m) => m.is_rack);
  const anyOver = members.some((m) => m.is_over_height);
  const cls = anyRack ? 'bg-[#E8EFF6] border-[#c2d4e6]' : 'bg-[#FBEEE0] border-[#ecd2b3]';
  const overCls = anyOver ? '!bg-[#f5ff00] !border-[#c9d400]' : '';
  const gname = 'Foremost 750 bbl Tanks';
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', `grp:${group}`); onDragStart(group); }}
      onDragEnd={onDragEnd}
      className={`chip relative rounded-md border cursor-grab active:cursor-grabbing px-2 py-1 pl-2.5 text-[11px] select-none ${cls} ${overCls}`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md ${anyOver ? 'bg-black' : (anyRack ? 'bg-[#1F4E79]' : 'bg-[#C2691C]')}`} />
      <div className="flex items-center justify-between gap-1.5">
        <span className={`font-bold ${anyOver ? 'text-black' : (anyRack ? 'text-[#1F4E79]' : 'text-[#9c4f12]')}`}>
          {gname}
          {anyOver && <span className="ml-1.5 bg-black text-[#f5ff00] text-[9px] font-bold px-1 rounded">OVER-HT {members[0].height_ft}′</span>}
        </span>
        <span className="text-[9px] text-enbridge-black/55 font-semibold bg-black/5 rounded-full px-1.5 py-0.5">{members.length} loads · 1 convoy</span>
      </div>
      <div className="text-[10px] text-enbridge-black/55 mt-0.5">{inTray ? `${members[0].ewp} · ` : ''}Ships together same day</div>
      <div className="mt-1 flex flex-col gap-0.5">
        {members.map((m) => (
          <div key={m.id} className="text-[10px] px-1.5 py-0.5 bg-white/60 rounded border border-black/5 flex justify-between gap-1.5">
            <span>{m.tag.replace(/\s*\(Foremost.*$/i, '')}</span>
            <span className="text-enbridge-black/55 tabular-nums">{m.height_ft}′ · {fmtWeight(m.weight_lbs)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Cell({
  dateISO, dayNum, units, floorForDrag,
  onDropItem, onDropGroup, onChipDragStart, onGroupDragStart, onDragEnd,
}: {
  dateISO: string;
  dayNum: number;
  units: Unit[];
  floorForDrag: () => string | null;
  onDropItem: (id: string, target: string) => void;
  onDropGroup: (g: string, target: string) => void;
  onChipDragStart: (id: string) => void;
  onGroupDragStart: (g: string) => void;
  onDragEnd: () => void;
}) {
  const [drag, setDrag] = useState<'idle' | 'valid' | 'invalid'>('idle');
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
      className={`bg-white border rounded-lg p-1.5 flex flex-col min-h-[116px] transition-colors
        ${drag === 'invalid' ? 'bg-[#fdeceb] border-[#c0392b] border-dashed' : ''}
        ${drag === 'valid' ? 'bg-[#eef6ee] border-[#3f9142] border-dashed' : 'border-black/10'}
      `}
    >
      <div className="text-[11px] text-enbridge-black/55 font-semibold flex justify-between px-1 pt-0.5 pb-1">
        <span>{dayNum}</span>
        {units.length > 0 && <span className="text-[10px]">{units.length}</span>}
      </div>
      <div className="flex flex-col gap-1">
        {units.map((u) =>
          u.kind === 'item' ? (
            <Chip key={u.pkg.id} pkg={u.pkg} inTray={false} onDragStart={onChipDragStart} onDragEnd={onDragEnd} />
          ) : (
            <GroupChip key={u.group} group={u.group} members={u.members} inTray={false} onDragStart={onGroupDragStart} onDragEnd={onDragEnd} />
          )
        )}
      </div>
    </div>
  );
}
