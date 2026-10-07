'use client';

import { useMemo } from 'react';
import { formatMoney } from '@/lib/money';
import type { PoWithTickets, TicketBrief, VendorSummary } from '@/lib/vendors';
import { isCostReportVendor } from '@/lib/vendorFlags';

// Document-style vendor snapshot. Rules mirrored from the SureLine playbook:
//   - Amber signature underline on the header (2px, once per sheet).
//   - Amber left-rail on the single emphasized stat, never anywhere else.
//   - Amber-700 (#a86f00) on PO section headings — reads like a report,
//     not a webapp.
//   - Neutral everywhere else. Restraint is the polish.
//   - Inline hex only — no CSS var reliance — so a dark-mode screen still
//     prints black on white and every border survives greyscale.

const AMBER = '#f5b119';
const AMBER_700 = '#a86f00';
const OVER = '#d8442f';
const OVER_BG = '#fdecea';
const UNDER = '#1f8a4c';
const UNDER_BG = '#e8f5ed';
const INK = '#0b0b0c';
const INK_MUTED = '#5b616b';
const RULE = '#d4d4d8';
const RULE_SOFT = '#ececee';
const SURFACE_2 = '#f7f7f8';

const PROJECT_LINE =
  'Aitken Creek Expansion Project · Enbridge Gas Inc. · Project 30006386';
const FOOTER_LINE =
  'NAEP Field Cost Tracker · Values reflect data at moment of print.';

function formatReportDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTicketDate(iso: string): string {
  const [y, m, dd] = iso.split('-').map(Number);
  if (!y || !m || !dd) return iso;
  return new Date(y, m - 1, dd).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PrintVendorReport({ vendor }: { vendor: VendorSummary }) {
  const generated = useMemo(() => formatReportDate(new Date()), []);
  const pctUsed =
    vendor.total_committed > 0
      ? (vendor.total_lem / vendor.total_committed) * 100
      : 0;
  const pctApproved =
    vendor.ticket_count > 0
      ? Math.round((vendor.approved_count / vendor.ticket_count) * 100)
      : 0;
  const facDelta = vendor.total_forecast - vendor.total_committed;
  // Cost-report vendors print as a portrait 1-page summary table — no
  // per-PO sections, no ticket chrome. Named CSS @page rule
  // (vendor-portrait, defined in globals.css) overrides the global
  // landscape default when the `print-portrait` class is present.
  const costReport = isCostReportVendor(vendor.slug);
  const wrapperClass = costReport
    ? 'print-only vendor-print-report print-portrait'
    : 'print-only vendor-print-report';

  return (
    <div className={wrapperClass} aria-hidden="true">
      <div
        style={{
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          fontSize: 10,
          lineHeight: 1.45,
          color: INK,
          paddingTop: 18,
        }}
      >
        <ReportHeader
          vendorDisplayName={vendor.vendor_display_name}
          vendorLegalName={vendor.vendor_legal_name}
          generated={generated}
          poCount={vendor.po_count}
          ticketCount={vendor.ticket_count}
          hideTicketCount={costReport}
        />

        <KpiStrip
          totalCommitted={vendor.total_committed}
          totalLem={vendor.total_lem}
          totalForecast={vendor.total_forecast}
          facDelta={facDelta}
          forecastedCount={vendor.forecasted_po_count}
          poCount={vendor.po_count}
          approvedCount={vendor.approved_count}
          ticketCount={vendor.ticket_count}
          pctApproved={pctApproved}
          pctUsed={pctUsed}
          valueAtRisk={vendor.total_pending_value}
          pendingCount={vendor.pending_count}
          hideApprovals={costReport}
        />

        {vendor.pos.length === 0 ? (
          <div
            style={{
              marginTop: 20,
              padding: 20,
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              textAlign: 'center',
              fontStyle: 'italic',
              color: INK_MUTED,
            }}
          >
            No POs on file for this vendor yet.
          </div>
        ) : costReport ? (
          <PortfolioSummaryTable pos={vendor.pos} />
        ) : (
          vendor.pos.map((po) => <PoReportSection key={po.id} po={po} />)
        )}

        <ReportFooter generated={generated} />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Header — vendor name left, meta stack right, amber 2px signature underline
// -----------------------------------------------------------------------------

function ReportHeader({
  vendorDisplayName,
  vendorLegalName,
  generated,
  poCount,
  ticketCount,
  hideTicketCount,
}: {
  vendorDisplayName: string;
  vendorLegalName: string;
  generated: string;
  poCount: number;
  ticketCount: number;
  hideTicketCount?: boolean;
}) {
  // Rendered as <div>, not <header>, because the schedule module's
  // @media print block globally hides <header> elements to make the
  // ProgramBar disappear during print — a semantic <header> here gets
  // caught by that same rule and the letterhead vanishes.
  return (
    <div style={{ marginBottom: 18 }}>
      {/* Brand strip — small orange marker + program name, gives the sheet
          a clear "who published this" line before the vendor takes over. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          fontWeight: 700,
          color: INK_MUTED,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 18,
            height: 3,
            background: '#d04e00',
          }}
        />
        NAEP Field Cost Tracker
        <span style={{ color: RULE }}>·</span>
        <span style={{ color: INK_MUTED, fontWeight: 500, letterSpacing: '0.05em' }}>
          Aitken Creek Expansion Project · Enbridge Gas Inc.
        </span>
      </div>

      {/* Main letterhead — vendor block left, meta stack right,
          amber signature underline below both. */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 24,
          borderBottom: `2px solid ${AMBER}`,
          paddingBottom: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: AMBER_700,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Vendor Snapshot
          </div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: INK,
            }}
          >
            {vendorDisplayName}
          </h1>
          <p
            style={{
              margin: '5px 0 0',
              fontSize: 10,
              color: INK_MUTED,
              fontWeight: 500,
            }}
          >
            {vendorLegalName}
          </p>
        </div>
        <MetaStack
          rows={[
            { label: 'Generated', value: generated },
            {
              label: 'Portfolio',
              value: hideTicketCount
                ? `${poCount} PO${poCount === 1 ? '' : 's'}`
                : `${poCount} PO${poCount === 1 ? '' : 's'} · ${ticketCount} ticket${ticketCount === 1 ? '' : 's'}`,
            },
            { label: 'Project', value: '30006386' },
          ]}
        />
      </div>
    </div>
  );
}

function MetaStack({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <div
      style={{
        textAlign: 'right',
        fontSize: 9,
        color: INK_MUTED,
        fontVariantNumeric: 'tabular-nums',
        minWidth: 200,
        lineHeight: 1.5,
      }}
    >
      {rows.map((r) => (
        <div key={r.label}>
          <span
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.11em',
              fontSize: 7,
              fontWeight: 700,
              marginRight: 8,
            }}
          >
            {r.label}
          </span>
          <span style={{ color: INK, fontWeight: 600 }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// KPI strip — one emphasized stat with amber left-rail; the rest neutral
// -----------------------------------------------------------------------------

function KpiStrip({
  totalCommitted,
  totalLem,
  totalForecast,
  facDelta,
  forecastedCount,
  poCount,
  approvedCount,
  ticketCount,
  pctApproved,
  pctUsed,
  valueAtRisk,
  pendingCount,
  hideApprovals,
}: {
  totalCommitted: number;
  totalLem: number;
  totalForecast: number;
  facDelta: number;
  forecastedCount: number;
  poCount: number;
  approvedCount: number;
  ticketCount: number;
  pctApproved: number;
  pctUsed: number;
  valueAtRisk: number;
  pendingCount: number;
  hideApprovals?: boolean;
}) {
  const facTone =
    facDelta > 0.5 ? OVER : facDelta < -0.5 ? UNDER : INK;
  const cols = hideApprovals ? 4 : 5;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 8,
        marginBottom: 18,
      }}
    >
      <KpiCell
        label="Total Committed"
        value={formatMoney(totalCommitted)}
        sub={`${poCount} PO${poCount === 1 ? '' : 's'}`}
      />
      <KpiCell
        label="LEM-to-Date"
        value={formatMoney(totalLem)}
        sub={`${pctUsed.toFixed(1)}% of commitment`}
        emphasis
      />
      <KpiCell
        label="Forecast at Completion"
        value={formatMoney(totalForecast)}
        sub={
          forecastedCount === 0
            ? `0 of ${poCount} POs forecasted`
            : `${facDelta >= 0 ? '+' : ''}${formatMoney(facDelta)} vs committed`
        }
        valueColor={facTone}
      />
      {!hideApprovals && (
        <KpiCell
          label="Approved by Enbridge"
          value={String(approvedCount)}
          sub={`${pctApproved}% of ${ticketCount} tickets`}
          valueColor={UNDER}
        />
      )}
      <KpiCell
        label="Value at Risk"
        value={formatMoney(valueAtRisk)}
        sub={`${pendingCount} pending sign-off`}
        valueColor={OVER}
      />
    </div>
  );
}

function KpiCell({
  label,
  value,
  sub,
  valueColor = INK,
  emphasis,
}: {
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${RULE}`,
        borderRadius: 4,
        borderLeft: emphasis
          ? `4px solid ${AMBER}`
          : `1px solid ${RULE}`,
        padding: '6px 9px',
        background: '#fff',
      }}
    >
      <div
        style={{
          fontSize: 6.5,
          textTransform: 'uppercase',
          letterSpacing: '0.11em',
          color: INK_MUTED,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 700,
          marginTop: 2,
          color: valueColor,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.015em',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 7.5,
          color: INK_MUTED,
          marginTop: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {sub}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Portfolio summary table — portrait, one row per PO, fits 15+ POs on one page
// Used for cost-report vendors (Medallion) where per-PO ticket chrome is noise.
// -----------------------------------------------------------------------------

function PortfolioSummaryTable({ pos }: { pos: PoWithTickets[] }) {
  // Sort by committed descending so the largest commitments read first —
  // same instinct as the on-screen VendorDetail list order.
  const sorted = [...pos].sort((a, b) => b.committed - a.committed);
  const totals = sorted.reduce(
    (acc, p) => {
      acc.committed += p.committed;
      acc.lem += p.lem;
      return acc;
    },
    { committed: 0, lem: 0 }
  );
  const totalRemaining = totals.committed - totals.lem;
  const totalBurn =
    totals.committed > 0 ? (totals.lem / totals.committed) * 100 : 0;

  const th: React.CSSProperties = {
    fontSize: 7,
    textTransform: 'uppercase',
    letterSpacing: '0.11em',
    fontWeight: 700,
    color: INK_MUTED,
    textAlign: 'left',
    padding: '6px 6px',
    borderBottom: `1.5px solid ${AMBER_700}`,
    whiteSpace: 'nowrap',
  };
  const thRight: React.CSSProperties = { ...th, textAlign: 'right' };
  const td: React.CSSProperties = {
    fontSize: 9,
    padding: '5px 6px',
    borderBottom: `1px solid ${RULE_SOFT}`,
    verticalAlign: 'top',
    color: INK,
  };
  const tdNum: React.CSSProperties = {
    ...td,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  };
  const tdMono: React.CSSProperties = {
    ...td,
    fontFamily: 'ui-monospace, "Cascadia Code", monospace',
    fontSize: 8.5,
    color: AMBER_700,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };

  return (
    <section style={{ marginTop: 6 }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
        }}
      >
        <colgroup>
          <col style={{ width: '19%' }} />
          <col />
          <col style={{ width: '13%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '8%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={th}>PO Number</th>
            <th style={th}>Scope</th>
            <th style={thRight}>Committed</th>
            <th style={thRight}>LEM-to-Date</th>
            <th style={thRight}>Remaining</th>
            <th style={thRight}>Burn</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((po) => {
            const remaining = po.committed - po.lem;
            const burn =
              po.committed > 0 ? (po.lem / po.committed) * 100 : 0;
            const over = remaining < -0.5;
            return (
              <tr key={po.id}>
                <td style={tdMono}>{po.po_number}</td>
                <td style={{ ...td, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {po.scope ?? '—'}
                </td>
                <td style={tdNum}>{formatMoney(po.committed)}</td>
                <td style={tdNum}>{formatMoney(po.lem)}</td>
                <td style={{ ...tdNum, color: over ? OVER : INK, fontWeight: over ? 600 : 400 }}>
                  {formatMoney(remaining)}
                </td>
                <td style={{ ...tdNum, color: burn > 100 ? OVER : burn > 80 ? AMBER_700 : INK_MUTED, fontWeight: 600 }}>
                  {po.committed > 0 ? `${burn.toFixed(1)}%` : '—'}
                </td>
              </tr>
            );
          })}
          {/* Totals row */}
          <tr>
            <td
              colSpan={2}
              style={{
                ...td,
                borderTop: `1.5px solid ${INK}`,
                borderBottom: `1.5px solid ${INK}`,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontSize: 8,
                color: INK,
              }}
            >
              Portfolio Totals
            </td>
            <td
              style={{
                ...tdNum,
                borderTop: `1.5px solid ${INK}`,
                borderBottom: `1.5px solid ${INK}`,
                fontWeight: 700,
              }}
            >
              {formatMoney(totals.committed)}
            </td>
            <td
              style={{
                ...tdNum,
                borderTop: `1.5px solid ${INK}`,
                borderBottom: `1.5px solid ${INK}`,
                fontWeight: 700,
              }}
            >
              {formatMoney(totals.lem)}
            </td>
            <td
              style={{
                ...tdNum,
                borderTop: `1.5px solid ${INK}`,
                borderBottom: `1.5px solid ${INK}`,
                fontWeight: 700,
                color: totalRemaining < -0.5 ? OVER : INK,
              }}
            >
              {formatMoney(totalRemaining)}
            </td>
            <td
              style={{
                ...tdNum,
                borderTop: `1.5px solid ${INK}`,
                borderBottom: `1.5px solid ${INK}`,
                fontWeight: 700,
                color: totalBurn > 100 ? OVER : totalBurn > 80 ? AMBER_700 : INK,
              }}
            >
              {`${totalBurn.toFixed(1)}%`}
            </td>
          </tr>
        </tbody>
      </table>
      <p
        style={{
          margin: '8px 0 0',
          fontSize: 7.5,
          color: INK_MUTED,
          fontStyle: 'italic',
        }}
      >
        LEM-to-Date values reflect the latest Medallion cost report
        (TOTAL AGAINST PO VALUE line). Vendors on a cost-report workflow do not
        log individual field tickets to this portal.
      </p>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Per-PO section — amber-700 heading, tight money strip, chip grid
// -----------------------------------------------------------------------------

function PoReportSection({ po }: { po: PoWithTickets }) {
  const total = po.tickets.length;
  const approved = po.tickets.filter((t) => t.status === 'invoiced').length;
  const pending = total - approved;
  const pctApp = total > 0 ? Math.round((approved / total) * 100) : 0;
  const pctUsed = po.committed > 0 ? (po.lem / po.committed) * 100 : 0;
  const remaining = po.committed - po.lem;
  const facDisplay = po.forecast != null ? formatMoney(po.forecast) : '—';

  return (
    <section
      className="print-po-section"
      style={{
        marginTop: 14,
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
    >
      {/* Section heading — amber-700, uppercase small caps */}
      <div
        style={{
          borderBottom: `1.5px solid ${AMBER_700}`,
          paddingBottom: 5,
          marginBottom: 6,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'ui-monospace, "Cascadia Code", monospace',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.03em',
              color: AMBER_700,
            }}
          >
            {po.po_number}
            {po.vendor_job_ref && (
              <span
                style={{
                  fontSize: 9,
                  marginLeft: 8,
                  padding: '0px 5px',
                  border: `1px solid ${AMBER_700}`,
                  borderRadius: 3,
                  color: AMBER_700,
                  fontWeight: 500,
                }}
              >
                {po.vendor_job_ref}
              </span>
            )}
            {po.project_cost_code && (
              <span
                style={{
                  fontSize: 9,
                  marginLeft: 8,
                  color: INK_MUTED,
                  fontWeight: 400,
                }}
              >
                {po.project_cost_code}
              </span>
            )}
          </div>
          {po.scope && (
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 9.5,
                color: INK,
                fontWeight: 400,
                fontFamily:
                  'Inter, ui-sans-serif, system-ui, sans-serif',
              }}
            >
              {po.scope}
            </p>
          )}
        </div>
        <div
          style={{
            fontSize: 8.5,
            color: INK_MUTED,
            fontVariantNumeric: 'tabular-nums',
            textAlign: 'right',
            whiteSpace: 'nowrap',
          }}
        >
          <div>
            {total} ticket{total === 1 ? '' : 's'} · {approved} approved
            {pending > 0 && (
              <span style={{ color: OVER }}> / {pending} pending</span>
            )}
          </div>
          <div>{pctUsed.toFixed(1)}% burn</div>
        </div>
      </div>

      {/* Money strip — no chrome, just labels and tabular values */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          padding: '4px 0 8px',
        }}
      >
        <MoneyBlock label="Committed" value={formatMoney(po.committed)} />
        <MoneyBlock label="LEM-to-Date" value={formatMoney(po.lem)} />
        <MoneyBlock label="Forecast" value={facDisplay} />
        <MoneyBlock
          label="Remaining"
          value={formatMoney(remaining)}
          color={remaining < 0 ? OVER : INK}
        />
      </div>

      {/* Thin approval-ratio rail — greyscale-safe (border + fill) */}
      {total > 0 && (
        <div style={{ padding: '2px 0 6px' }}>
          <div
            style={{
              height: 3,
              background: OVER_BG,
              border: `1px solid ${OVER}55`,
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pctApp}%`,
                height: '100%',
                background: UNDER,
              }}
            />
          </div>
          <div
            style={{
              marginTop: 2,
              fontSize: 7.5,
              color: INK_MUTED,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {pctApp}% approved · {formatMoney(po.lem)} logged
          </div>
        </div>
      )}

      {/* Ticket chip grid */}
      <div style={{ paddingBottom: 4 }}>
        {total === 0 ? (
          <p
            style={{
              margin: 0,
              fontStyle: 'italic',
              color: INK_MUTED,
              fontSize: 9,
            }}
          >
            No tickets on file yet.
          </p>
        ) : (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 3,
            }}
          >
            {po.tickets.map((t) => (
              <TicketChip key={t.id} ticket={t} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function MoneyBlock({
  label,
  value,
  color = INK,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 6.5,
          textTransform: 'uppercase',
          letterSpacing: '0.11em',
          color: INK_MUTED,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          marginTop: 1,
          color,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.015em',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function TicketChip({ ticket }: { ticket: TicketBrief }) {
  const approved = ticket.status === 'invoiced';
  const color = approved ? UNDER : OVER;
  const bg = approved ? UNDER_BG : OVER_BG;
  const title = `${ticket.ticket_number} · ${formatTicketDate(ticket.ticket_date)} · ${formatMoney(ticket.face_value)} · ${approved ? 'Approved' : 'Pending'}`;
  return (
    <span
      title={title}
      style={{
        fontFamily: 'ui-monospace, "Cascadia Code", monospace',
        fontSize: 7.5,
        fontWeight: 500,
        color,
        background: bg,
        border: `1px solid ${color}`,
        borderRadius: 3,
        padding: '1px 4px',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}
    >
      {ticket.ticket_number}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Footer — fine print, source note, generated stamp
// -----------------------------------------------------------------------------

function ReportFooter({ generated }: { generated: string }) {
  return (
    <div
      style={{
        marginTop: 20,
        paddingTop: 8,
        borderTop: `1px solid ${AMBER}`,
        fontSize: 7.5,
        color: INK_MUTED,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}
    >
      <span>{FOOTER_LINE}</span>
      <span
        style={{
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.03em',
        }}
      >
        Generated {generated} · {PROJECT_LINE.split(' · ').pop()}
      </span>
    </div>
  );
}
