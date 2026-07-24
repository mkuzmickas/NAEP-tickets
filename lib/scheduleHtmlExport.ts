import type {
  SchedulePackage,
  ScheduleWalkdown,
  ScheduleEvent,
} from '@/types/schedule';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function esc(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtMoney(n: number | null): string {
  if (n == null) return '';
  return `$${n.toLocaleString('en-CA', { maximumFractionDigits: 0 })}`;
}

function fmtWeight(w: string | null): string {
  return w ?? '';
}

function keyYM(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

const WD_STYLES: Record<number, { bg: string; text: string; border: string }> = {
  30: { bg: '#dcfce7', text: '#14532d', border: '#86efac' },
  60: { bg: '#fef3c7', text: '#78350f', border: '#fcd34d' },
  90: { bg: '#fee2e2', text: '#7f1d1d', border: '#fca5a5' },
};

const EVT_STYLES: Record<string, { bar: string }> = {
  blackout:  { bar: '#ef4444' },
  milestone: { bar: '#f59e0b' },
  note:      { bar: '#3b82f6' },
};

export function buildScheduleHtml({
  packages,
  walkdowns,
  events,
  monthRange,
}: {
  packages: SchedulePackage[];
  walkdowns: ScheduleWalkdown[];
  events: ScheduleEvent[];
  monthRange: [number, number][];
}): string {
  const today = new Date().toISOString().slice(0, 10);

  // Index by date
  const pkgByDate = new Map<string, SchedulePackage[]>();
  for (const p of packages) {
    if (!p.planned_ship_date) continue;
    const arr = pkgByDate.get(p.planned_ship_date) ?? [];
    arr.push(p);
    pkgByDate.set(p.planned_ship_date, arr);
  }

  const wdByDate = new Map<string, ScheduleWalkdown[]>();
  for (const w of walkdowns) {
    const arr = wdByDate.get(w.event_date) ?? [];
    arr.push(w);
    wdByDate.set(w.event_date, arr);
  }

  const eventCoverage = new Map<
    string,
    { event: ScheduleEvent; isStart: boolean; isEnd: boolean }[]
  >();
  for (const e of events) {
    const d = new Date(e.start_date + 'T00:00:00');
    const stop = new Date(e.end_date + 'T00:00:00');
    while (d <= stop) {
      const iso = d.toISOString().slice(0, 10);
      const arr = eventCoverage.get(iso) ?? [];
      arr.push({
        event: e,
        isStart: iso === e.start_date,
        isEnd: iso === e.end_date,
      });
      eventCoverage.set(iso, arr);
      d.setDate(d.getDate() + 1);
    }
  }

  const totalScheduled = packages.filter((p) => p.planned_ship_date).length;
  const totalUnscheduled = packages.length - totalScheduled;
  const totalOverHeight = packages.filter((p) => p.is_over_height).length;

  const monthsHtml = monthRange
    .map(([y, m]) => renderMonth(y, m, pkgByDate, wdByDate, eventCoverage))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ACGS Ship Schedule — Aitken Creek</title>
<style>
  :root {
    --border: #e5e7eb;
    --text: #131417;
    --muted: #6b7280;
    --page-bg: #f3f4f6;
    --surface: #ffffff;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    color: var(--text);
    background: var(--page-bg);
    font-size: 13px;
    line-height: 1.4;
  }
  .container {
    max-width: 1400px;
    margin: 0 auto;
  }
  header.top {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px 24px;
    margin-bottom: 20px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
  }
  header.top h1 {
    font-size: 20px;
    margin: 0 0 4px;
    letter-spacing: -0.01em;
  }
  header.top .sub {
    font-size: 12px;
    color: var(--muted);
  }
  header.top .stats {
    display: flex;
    gap: 24px;
    font-size: 11px;
    color: var(--muted);
  }
  header.top .stats strong {
    display: block;
    color: var(--text);
    font-size: 16px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    margin-top: 2px;
  }
  .legend {
    display: flex;
    gap: 18px;
    font-size: 11px;
    color: var(--muted);
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .legend .sw {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    margin-right: 5px;
    vertical-align: -1px;
  }
  .month {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px 24px;
    margin-bottom: 20px;
    page-break-after: always;
    break-after: page;
  }
  .month:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .month h2 {
    margin: 0 0 12px;
    font-size: 18px;
    display: flex;
    align-items: baseline;
    gap: 10px;
    border-bottom: 2px solid #d04e00;
    padding-bottom: 8px;
  }
  .month h2 .year { font-size: 13px; color: var(--muted); font-weight: 500; }
  .month h2 .count { margin-left: auto; font-size: 11px; color: var(--muted); font-weight: 500; }
  .weekhead, .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }
  .weekhead {
    margin-bottom: 4px;
  }
  .weekhead div {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    padding: 4px 6px;
    font-weight: 600;
  }
  .cell {
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 4px;
    min-height: 90px;
    background: var(--surface);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }
  .cell.out { background: transparent; border-color: transparent; }
  .cell .daynum {
    font-size: 10px;
    color: var(--muted);
    font-weight: 600;
    padding: 2px 4px 4px;
  }
  .evband {
    color: #fff;
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 1px 5px;
    line-height: 13px;
    margin: -4px -4px 3px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .evband.start { border-top-left-radius: 3px; }
  .evband.end { border-top-right-radius: 3px; }
  .chip {
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 2px 5px 2px 6px;
    font-size: 9.5px;
    margin-bottom: 2px;
    line-height: 1.2;
    position: relative;
    overflow: hidden;
  }
  .chip .tag { font-weight: 700; font-size: 9.5px; }
  .chip .meta { font-size: 8.5px; opacity: 0.7; margin-top: 1px; }
  .chip.rack { background: #e8eff6; border-color: #c2d4e6; color: #1F4E79; }
  .chip.rack .tag { color: #1F4E79; }
  .chip.ewp { background: #fbeee0; border-color: #ecd2b3; color: #9c4f12; }
  .chip.ewp .tag { color: #9c4f12; }
  .chip.overheight {
    background: #f5ff00 !important;
    border-color: #c9d400 !important;
    color: #000 !important;
  }
  .chip.overheight .tag { color: #000; }
  .oh {
    background: #000;
    color: #f5ff00;
    font-size: 7.5px;
    font-weight: 700;
    padding: 0 3px;
    border-radius: 2px;
    margin-left: 4px;
    vertical-align: 1px;
  }
  .wd {
    font-size: 8.5px;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 3px;
    margin-bottom: 2px;
    border: 1px solid;
  }
  footer.foot {
    font-size: 10px;
    color: var(--muted);
    padding: 12px 4px 4px;
    text-align: center;
    border-top: 1px solid var(--border);
    margin-top: 12px;
  }
  @page { size: letter landscape; margin: 0.35in; }
  @media print {
    body { padding: 0; background: #fff; }
    header.top, .month { border-color: #ccc; box-shadow: none; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style>
</head>
<body>
<div class="container">
  <header class="top">
    <div>
      <h1>ACGS Ship Schedule — Aitken Creek Expansion</h1>
      <div class="sub">Enbridge Gas Inc. · d-44-L / 94-A-13 Aitken Creek · Project 30006386 · Exported ${today}</div>
    </div>
    <div class="stats">
      <div>Scheduled<strong>${totalScheduled}</strong></div>
      <div>Unscheduled<strong>${totalUnscheduled}</strong></div>
      <div>Over-height<strong>${totalOverHeight}</strong></div>
      <div>Total packages<strong>${packages.length}</strong></div>
    </div>
  </header>

  <div class="legend">
    <span><span class="sw" style="background:#1F4E79"></span>Pipe Rack (EWP 8)</span>
    <span><span class="sw" style="background:#C2691C"></span>Other EWP</span>
    <span><span class="sw" style="background:#f5ff00;border:1px solid #c9d400"></span>Over-height &gt;13'</span>
    <span><span class="sw" style="background:#22c55e"></span>Walk-down (30%)</span>
    <span><span class="sw" style="background:#eab308"></span>Walk-down (60%)</span>
    <span><span class="sw" style="background:#ef4444"></span>Walk-down (90%) / Blackout</span>
  </div>

  ${monthsHtml}

  <footer class="foot">
    Exported ${today} from the NAEP Field Cost Tracker · Aitken Creek Expansion
  </footer>
</div>
</body>
</html>`;
}

function renderMonth(
  year: number,
  month: number,
  pkgByDate: Map<string, SchedulePackage[]>,
  wdByDate: Map<string, ScheduleWalkdown[]>,
  eventCoverage: Map<
    string,
    { event: ScheduleEvent; isStart: boolean; isEnd: boolean }[]
  >
): string {
  const ym = keyYM(year, month);
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;

  let cells = '';
  let inMonthShippingCount = 0;

  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startDow + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells += `<div class="cell out"></div>`;
      continue;
    }
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const pkgs = pkgByDate.get(iso) ?? [];
    const wds = wdByDate.get(iso) ?? [];
    const evs = eventCoverage.get(iso) ?? [];
    inMonthShippingCount += pkgs.length;

    let bands = '';
    for (const { event, isStart, isEnd } of evs) {
      const bar = EVT_STYLES[event.kind]?.bar ?? '#6b7280';
      const label = isStart ? esc(event.name) : isEnd ? '›' : '…';
      const cls = `evband${isStart ? ' start' : ''}${isEnd ? ' end' : ''}`;
      bands += `<div class="${cls}" style="background:${bar}" title="${esc(event.name)}">${label}</div>`;
    }

    let wdHtml = '';
    for (const w of wds) {
      const s = WD_STYLES[w.level] ?? WD_STYLES[30];
      wdHtml += `<div class="wd" style="background:${s.bg};color:${s.text};border-color:${s.border}">${w.level}% · ${esc(w.name)}</div>`;
    }

    let pkgHtml = '';
    for (const p of pkgs) {
      const dims =
        p.length_ft != null
          ? `${p.length_ft}×${p.width_ft}×${p.height_ft} ft`
          : '—';
      const wt = p.weight_lbs ? ` · ${fmtWeight(p.weight_lbs)}` : '';
      const isRack = p.is_rack;
      const cls = `chip ${isRack ? 'rack' : 'ewp'}${p.is_over_height ? ' overheight' : ''}`;
      const oh = p.is_over_height
        ? ` <span class="oh">OH ${p.height_ft}'</span>`
        : '';
      pkgHtml += `<div class="${cls}"><div class="tag">${esc(p.tag)}${oh}</div><div class="meta">${dims}${wt}</div></div>`;
    }

    cells += `<div class="cell">${bands}<div class="daynum">${dayNum}</div>${wdHtml}${pkgHtml}</div>`;
  }

  const weekhead = DOW.map((d) => `<div>${d}</div>`).join('');

  return `
<section class="month" data-ym="${ym}">
  <h2>${MONTHS[month]} <span class="year">${year}</span> <span class="count">${inMonthShippingCount ? `${inMonthShippingCount} shipping` : ''}</span></h2>
  <div class="weekhead">${weekhead}</div>
  <div class="grid">${cells}</div>
</section>`;
}
