'use client';

import { useMemo } from 'react';
import { formatMoney } from '@/lib/money';
import type { PoWithTickets, TicketBrief, VendorSummary } from '@/lib/vendors';

// Inline styles + explicit hex — no CSS-var reliance — so a dark-mode
// screen still prints as clean black-on-white. Same pattern as the
// Ticket Map's PrintUnapproved report.

const PROJECT_LINE =
  'Aitken Creek Expansion Project · Enbridge Gas Inc. · Project 30006386';
const FOOTER_LINE =
  'Snapshot generated from the NAEP Field Cost Tracker. Values reflect data at the moment of print.';

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

  return (
    <div className="print-only" aria-hidden="true">
      <div
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
          lineHeight: 1.4,
        }}
      >
        <ReportHeader
          vendorDisplayName={vendor.vendor_display_name}
          vendorLegalName={vendor.vendor_legal_name}
          generated={generated}
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
        />

        {vendor.pos.length === 0 ? (
          <div
            style={{
              marginTop: 24,
              padding: 20,
              border: '1px solid #ccc',
              textAlign: 'center',
              fontStyle: 'italic',
            }}
          >
            No POs on file for this vendor yet.
          </div>
        ) : (
          vendor.pos.map((po) => <PoReportSection key={po.id} po={po} />)
        )}

        <div
          style={{
            marginTop: 24,
            paddingTop: 8,
            borderTop: '1px solid #aaa',
            fontSize: 9,
            color: '#555',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>{FOOTER_LINE}</span>
          <span>Generated {generated}</span>
        </div>
      </div>
    </div>
  );
}

function ReportHeader({
  vendorDisplayName,
  vendorLegalName,
  generated,
}: {
  vendorDisplayName: string;
  vendorLegalName: string;
  generated: string;
}) {
  return (
    <header
      style={{
        borderBottom: '2px solid #d04e00',
        paddingBottom: 8,
        marginBottom: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 12,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#777',
            fontWeight: 600,
            marginBottom: 2,
          }}
        >
          Vendor Snapshot
        </div>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 700,
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          {vendorDisplayName}
        </h1>
        <p style={{ margin: '2px 0 0', fontSize: 9, color: '#555' }}>
          {vendorLegalName} · {PROJECT_LINE}
        </p>
      </div>
      <div
        style={{
          fontSize: 9,
          color: '#555',
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        Generated {generated}
      </div>
    </header>
  );
}

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
}) {
  const facTone =
    facDelta > 0.5 ? '#d8442f' : facDelta < -0.5 ? '#1f8a4c' : '#131417';
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 12,
        marginBottom: 20,
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
      <KpiCell
        label="Approved by Enbridge"
        value={String(approvedCount)}
        sub={`${pctApproved}% of ${ticketCount} tickets`}
        valueColor="#1f8a4c"
      />
      <KpiCell
        label="Value at Risk"
        value={formatMoney(valueAtRisk)}
        sub={`${pendingCount} pending sign-off`}
        valueColor="#d8442f"
      />
    </div>
  );
}

function KpiCell({
  label,
  value,
  sub,
  valueColor = '#131417',
}: {
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: 4,
        padding: '5px 8px',
      }}
    >
      <div
        style={{
          fontSize: 7,
          textTransform: 'uppercase',
          letterSpacing: '0.09em',
          color: '#666',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          marginTop: 1,
          color: valueColor,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 8,
          color: '#666',
          marginTop: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {sub}
      </div>
    </div>
  );
}

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
        marginTop: 10,
        border: '1px solid #ddd',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {/* Header: PO number + job ref + scope + right-aligned meta */}
      <div
        style={{
          borderBottom: '1px solid #131417',
          padding: '6px 10px',
          background: '#f7f7f7',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 12,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              {po.po_number}
            </span>
            {po.vendor_job_ref && (
              <span
                style={{
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 8.5,
                  marginLeft: 6,
                  padding: '0px 4px',
                  border: '1px solid #999',
                  borderRadius: 3,
                  color: '#555',
                }}
              >
                {po.vendor_job_ref}
              </span>
            )}
            {po.project_cost_code && (
              <span
                style={{
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 8.5,
                  marginLeft: 6,
                  color: '#777',
                }}
              >
                {po.project_cost_code}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 9,
              color: '#333',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {total} ticket{total === 1 ? '' : 's'} · {approved} approved / {pending} pending · {pctUsed.toFixed(1)}% burn
          </div>
        </div>
        {po.scope && (
          <p style={{ margin: '2px 0 0', fontSize: 9, color: '#333' }}>
            {po.scope}
          </p>
        )}
      </div>

      {/* Money strip — tighter than before */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
          borderBottom: '1px solid #eee',
        }}
      >
        <MoneyBlock label="Committed" value={po.committed} />
        <MoneyBlock label="LEM-to-Date" value={po.lem} />
        <MoneyBlock label="Forecast" value={facDisplay} isString />
        <MoneyBlock
          label="Remaining"
          value={remaining}
          color={remaining < 0 ? '#d8442f' : '#131417'}
        />
      </div>

      {/* Approval progress bar (thin) — mirrors the on-screen bar */}
      {total > 0 && (
        <div style={{ padding: '5px 10px 2px', background: '#fafafa' }}>
          <div
            style={{
              height: 3,
              background: '#fce7ed',
              border: '1px solid #f0b4bd',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pctApp}%`,
                height: '100%',
                background: '#1f8a4c',
              }}
            />
          </div>
          <div
            style={{
              marginTop: 2,
              fontSize: 8,
              color: '#666',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {pctApp}% approved · {formatMoney(po.lem)} logged
          </div>
        </div>
      )}

      {/* Ticket chip grid — mirrors on-screen VendorPoCard layout */}
      <div style={{ padding: '6px 10px 8px' }}>
        {total === 0 ? (
          <p
            style={{
              margin: 0,
              fontStyle: 'italic',
              color: '#666',
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

function TicketChip({ ticket }: { ticket: TicketBrief }) {
  const approved = ticket.status === 'invoiced';
  const color = approved ? '#1f8a4c' : '#d8442f';
  const bg = approved ? '#e8f5ed' : '#fdecea';
  const title = `${ticket.ticket_number} · ${formatTicketDate(ticket.ticket_date)} · ${formatMoney(ticket.face_value)} · ${approved ? 'Approved' : 'Pending'}`;
  return (
    <span
      title={title}
      style={{
        fontFamily: 'ui-monospace, monospace',
        fontSize: 8,
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

function MoneyBlock({
  label,
  value,
  color = '#131417',
  isString,
}: {
  label: string;
  value: number | string;
  color?: string;
  isString?: boolean;
}) {
  return (
    <div
      style={{
        padding: '5px 10px',
        borderRight: '1px solid #eee',
      }}
    >
      <div
        style={{
          fontSize: 7,
          textTransform: 'uppercase',
          letterSpacing: '0.09em',
          color: '#666',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          marginTop: 1,
          color,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
        }}
      >
        {isString ? (value as string) : formatMoney(value as number)}
      </div>
    </div>
  );
}

