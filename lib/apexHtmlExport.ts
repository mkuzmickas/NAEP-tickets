import type { ApexData, ApexPo, ApexLineItem } from '@/lib/apex';

/**
 * Build a self-contained HTML document that renders the current Apex PVF
 * snapshot with no external assets — CSS is inlined. Safe to email, drop in
 * SharePoint, or open from a local drive.
 *
 * Each PO card is a native <details>/<summary> so the reader can collapse /
 * expand individual POs the same way the portal's Bucket view works. Two small
 * "Expand all" / "Collapse all" buttons at the top drive every card at once,
 * and a tiny beforeprint listener forces every <details> open so printed /
 * PDF'd copies always show all rows.
 */
export function buildApexHtmlExport(data: ApexData, generatedAt: Date): string {
  const money = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const totalDated = data.totals.lines_dated;
  const totalLines = data.totals.line_count;
  const datedPct = totalLines > 0 ? (totalDated / totalLines) * 100 : 0;
  const receivedPct = totalLines > 0 ? (data.totals.lines_received / totalLines) * 100 : 0;

  const posByEwp = groupByEwp(data.pos);

  const generatedIso = generatedAt.toISOString().slice(0, 19).replace('T', ' ');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Aitken Creek · Site PVF snapshot · ${escapeHtml(generatedIso)}</title>
<style>
  :root {
    --bg: #f7f7f5;
    --surface: #ffffff;
    --surface-2: #f2f2ef;
    --border: #e2e2dd;
    --text: #1a1a1a;
    --text-muted: #6b6b66;
    --brand: #f6a800;
    --info: #1f78d1;
    --info-bg: #e6f0fb;
    --ok: #2f7a3f;
    --ok-bg: #e6f4ea;
    --warn: #b56800;
    --black: #1a1a1a;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.4;
  }
  .wrap { max-width: 1400px; margin: 0 auto; padding: 24px; }
  h1 {
    font-size: 22px;
    margin: 0 0 4px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  h2 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    font-weight: 600;
    margin: 24px 0 10px;
  }
  .subtitle {
    color: var(--text-muted);
    font-size: 13px;
    margin: 0 0 16px;
  }
  .toolbar {
    display: flex;
    gap: 8px;
    margin: 0 0 16px;
    flex-wrap: wrap;
  }
  .toolbar button {
    font: inherit;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }
  .toolbar button:hover { background: var(--surface-2); }
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
    margin-bottom: 24px;
  }
  .tile {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 14px 16px;
  }
  .tile-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
  }
  .tile-value {
    margin-top: 4px;
    font-size: 20px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .tile-sub {
    margin-top: 2px;
    font-size: 11px;
    color: var(--text-muted);
  }
  details.card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    margin-bottom: 12px;
    overflow: hidden;
    break-inside: avoid;
  }
  /* Hide native disclosure marker; we draw our own so it's consistent
     between browsers (Chrome, Safari, Firefox all render the default
     differently). */
  details.card > summary {
    list-style: none;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    padding: 12px 16px;
    background: var(--surface-2);
    flex-wrap: wrap;
    outline: none;
  }
  details.card > summary::-webkit-details-marker { display: none; }
  details.card > summary::marker { content: ''; }
  details.card[open] > summary { border-bottom: 1px solid var(--border); }
  .card-head-left {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    min-width: 0;
    flex: 1;
  }
  .disclosure {
    display: inline-block;
    width: 12px;
    height: 12px;
    margin-top: 3px;
    flex-shrink: 0;
    transition: transform 120ms ease;
    color: var(--text-muted);
  }
  details.card[open] > summary .disclosure { transform: rotate(90deg); }
  .disclosure svg { width: 100%; height: 100%; display: block; }
  .card-head-body { min-width: 0; }
  .card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 4px;
  }
  .po-number { font-weight: 700; font-size: 14px; }
  .desc { color: var(--text-muted); font-size: 12px; }
  .card-metrics {
    display: flex;
    gap: 20px;
    text-align: right;
  }
  .metric-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
  }
  .metric-value {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    font-size: 13px;
  }
  .badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
    line-height: 1.4;
    white-space: nowrap;
  }
  .badge-brand { background: var(--brand); color: #1a1a1a; }
  .badge-info { background: var(--info-bg); color: var(--info); }
  .badge-ok { background: var(--ok-bg); color: var(--ok); }
  .table-wrap { overflow-x: auto; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th, td {
    padding: 6px 10px;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid var(--border);
  }
  th {
    background: var(--surface);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    border-bottom: 2px solid var(--border);
  }
  td.right, th.right { text-align: right; font-variant-numeric: tabular-nums; }
  td.mono { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: 11px; }
  tr:last-child td { border-bottom: 0; }
  .foot {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
    font-size: 11px;
    color: var(--text-muted);
  }
  @media print {
    body { background: white; }
    .wrap { padding: 12px; max-width: none; }
    .toolbar { display: none; }
    details.card { border-color: #ccc; }
    /* Force every card open when printing so paper/PDF shows every line. */
    details.card > summary { list-style: none; cursor: default; }
    details.card > summary .disclosure { display: none; }
    h2 { break-after: avoid; }
  }
</style>
</head>
<body>
<div class="wrap">
  <h1>Aitken Creek · Site PVF snapshot</h1>
  <p class="subtitle">
    Apex Distribution pipe, valves &amp; fittings scheduled for the Aitken Creek Expansion.
    Snapshot generated ${escapeHtml(generatedIso)}.
  </p>

  <div class="toolbar" role="toolbar" aria-label="Card controls">
    <button type="button" data-action="expand-all">Expand all</button>
    <button type="button" data-action="collapse-all">Collapse all</button>
  </div>

  <div class="tiles">
    <div class="tile">
      <div class="tile-label">Total PO Value</div>
      <div class="tile-value">${escapeHtml(money.format(data.totals.total_value))}</div>
      <div class="tile-sub">${data.totals.po_count} PO${data.totals.po_count === 1 ? '' : 's'}</div>
    </div>
    <div class="tile">
      <div class="tile-label">Line Items</div>
      <div class="tile-value">${data.totals.line_count}</div>
      <div class="tile-sub">all POs combined</div>
    </div>
    <div class="tile">
      <div class="tile-label">Ship Date Set</div>
      <div class="tile-value">${totalDated} / ${totalLines}</div>
      <div class="tile-sub">${datedPct.toFixed(0)}% tagged</div>
    </div>
    <div class="tile">
      <div class="tile-label">Received on Site</div>
      <div class="tile-value">${data.totals.lines_received} / ${totalLines}</div>
      <div class="tile-sub">${receivedPct.toFixed(0)}% received</div>
    </div>
  </div>

  ${posByEwp
    .map(
      ([ewp, pos]) => `
    <h2>${escapeHtml(ewp)} · ${pos.length} PO${pos.length === 1 ? '' : 's'} · ${escapeHtml(
        money.format(pos.reduce((s, p) => s + p.total_amount, 0))
      )}</h2>
    ${pos.map((po) => renderPoCard(po, money)).join('')}
  `
    )
    .join('')}

  <div class="foot">
    Aitken Creek Expansion · Project 30006386 · Generated by NAEP Field Cost Tracker on ${escapeHtml(
      generatedIso
    )}.
    ${data.totals.line_count} line items across ${data.totals.po_count} Apex POs, total commitment ${escapeHtml(
    money.format(data.totals.total_value)
  )}.
  </div>
</div>
<script>
  (function () {
    var cards = document.querySelectorAll('details.card');
    document.querySelectorAll('.toolbar [data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('data-action') === 'expand-all';
        cards.forEach(function (c) { c.open = open; });
      });
    });
    // Always print with every card expanded, then restore the reader's state.
    var savedState = null;
    window.addEventListener('beforeprint', function () {
      savedState = Array.prototype.map.call(cards, function (c) { return c.open; });
      cards.forEach(function (c) { c.open = true; });
    });
    window.addEventListener('afterprint', function () {
      if (!savedState) return;
      cards.forEach(function (c, i) { c.open = savedState[i]; });
      savedState = null;
    });
  })();
</script>
</body>
</html>`;
}

function renderPoCard(po: ApexPo, money: Intl.NumberFormat): string {
  const shipRange = shipRangeSummary(po.lines);
  const rows = po.lines
    .slice()
    .sort((a, b) => a.line_number - b.line_number)
    .map(
      (l) => `
      <tr>
        <td class="right mono">${l.line_number}</td>
        <td class="mono">${escapeHtml(l.size ?? '—')}</td>
        <td>${escapeHtml(l.description)}</td>
        <td class="right mono">${escapeHtml(formatQty(l.quantity, l.uom))}</td>
        <td class="right mono">${escapeHtml(money.format(l.unit_cost))}</td>
        <td class="right mono">${escapeHtml(money.format(l.amount))}</td>
        <td class="mono">${l.ship_date ? `<span class="badge badge-info">${escapeHtml(l.ship_date)}</span>` : '—'}</td>
        <td class="mono">${l.received_date ? `<span class="badge badge-ok">${escapeHtml(l.received_date)}</span>` : '—'}</td>
      </tr>`
    )
    .join('');

  return `
  <details class="card">
    <summary>
      <div class="card-head-left">
        <span class="disclosure" aria-hidden="true">
          <svg viewBox="0 0 12 12"><path d="M4 2 l4 4 l-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <div class="card-head-body">
          <div class="card-title">
            <span class="po-number">${escapeHtml(po.po_number)}</span>
            <span class="badge badge-brand">${escapeHtml(po.ewp)}</span>
            ${po.gle_package ? `<span class="badge badge-info">${escapeHtml(po.gle_package)}</span>` : ''}
          </div>
          ${po.description ? `<div class="desc">${escapeHtml(po.description)}</div>` : ''}
        </div>
      </div>
      <div class="card-metrics">
        <div>
          <div class="metric-label">Ships</div>
          <div class="metric-value">${escapeHtml(shipRange)}</div>
        </div>
        <div>
          <div class="metric-label">Total</div>
          <div class="metric-value">${escapeHtml(money.format(po.total_amount))}</div>
        </div>
        <div>
          <div class="metric-label">Lines</div>
          <div class="metric-value">${po.line_count}</div>
        </div>
        <div>
          <div class="metric-label">Dated</div>
          <div class="metric-value">${po.lines_dated} / ${po.line_count}</div>
        </div>
      </div>
    </summary>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="right">#</th>
            <th>Size</th>
            <th>Description</th>
            <th class="right">Qty</th>
            <th class="right">Unit cost</th>
            <th class="right">Amount</th>
            <th>Ship date</th>
            <th>Received</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </details>`;
}

function shipRangeSummary(lines: ApexLineItem[]): string {
  const dates = lines.map((l) => l.ship_date).filter((d): d is string => !!d);
  if (dates.length === 0) return '—';
  const sorted = [...dates].sort();
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) return min;
  const [minY] = min.split('-');
  const [maxY, maxM, maxD] = max.split('-');
  if (minY === maxY) return `${min} → ${maxM}-${maxD}`;
  return `${min} → ${max}`;
}

function groupByEwp(pos: ApexPo[]): [string, ApexPo[]][] {
  const m = new Map<string, ApexPo[]>();
  for (const p of pos) {
    const arr = m.get(p.ewp) ?? [];
    arr.push(p);
    m.set(p.ewp, arr);
  }
  return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function formatQty(n: number, uom: string): string {
  const isInt = Number.isInteger(n);
  return `${isInt ? n.toString() : n.toFixed(2)} ${uom}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
