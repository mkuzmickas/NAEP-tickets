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
        paddingBottom: 12,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: '#777',
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        Vendor Snapshot
      </div>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: 0,
          letterSpacing: '-0.01em',
        }}
      >
        {vendorDisplayName}
      </h1>
      <p style={{ margin: '3px 0 0', fontSize: 10, color: '#555' }}>
        {vendorLegalName}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: 10, color: '#555' }}>
        {PROJECT_LINE}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: 10, color: '#555' }}>
        Generated {generated}
      </p>
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
        padding: '8px 10px',
      }}
    >
      <div
        style={{
          fontSize: 7.5,
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
          fontSize: 15,
          fontWeight: 700,
          marginTop: 3,
          color: valueColor,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 8.5,
          color: '#666',
          marginTop: 2,
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
  const facDisplay =
    po.forecast != null ? formatMoney(po.forecast) : '—';

  return (
    <section
      className="print-po-section"
      style={{
        marginTop: 18,
        border: '1px solid #ddd',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          borderBottom: '1.5px solid #131417',
          padding: '8px 12px',
          background: '#f5f5f5',
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
                fontSize: 12,
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
                  fontSize: 9,
                  marginLeft: 8,
                  padding: '1px 5px',
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
                  fontSize: 9,
                  marginLeft: 8,
                  color: '#777',
                }}
              >
                {po.project_cost_code}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 10,
              color: '#333',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {total} ticket{total === 1 ? '' : 's'} · {pctApp}% approved ·{' '}
            {pctUsed.toFixed(1)}% burn
          </div>
        </div>
        {po.scope && (
          <p style={{ margin: '4px 0 0', fontSize: 10, color: '#333' }}>
            {po.scope}
          </p>
        )}
      </div>

      {/* Money strip */}
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

      {/* Ticket table */}
      {total === 0 ? (
        <p
          style={{
            padding: '10px 12px',
            fontStyle: 'italic',
            color: '#666',
            margin: 0,
            fontSize: 10,
          }}
        >
          No tickets on file yet.
        </p>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 10,
          }}
        >
          <thead>
            <tr>
              <ReportTh>Ticket #</ReportTh>
              <ReportTh>Date</ReportTh>
              <ReportTh>Status</ReportTh>
              <ReportTh right>Value</ReportTh>
            </tr>
          </thead>
          <tbody>
            {po.tickets.map((t) => (
              <TicketRow key={t.id} ticket={t} />
            ))}
            <tr>
              <td
                colSpan={3}
                style={{
                  paddingTop: 5,
                  paddingRight: 8,
                  textAlign: 'right',
                  fontWeight: 600,
                  fontSize: 10,
                  borderTop: '1px solid #aaa',
                }}
              >
                Subtotal · {approved} approved / {pending} pending
              </td>
              <td
                style={{
                  paddingTop: 5,
                  paddingLeft: 8,
                  paddingRight: 12,
                  textAlign: 'right',
                  fontWeight: 700,
                  fontFamily: 'ui-monospace, monospace',
                  fontVariantNumeric: 'tabular-nums',
                  borderTop: '1px solid #aaa',
                }}
              >
                {formatMoney(po.lem)}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </section>
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
        padding: '8px 12px',
        borderRight: '1px solid #eee',
      }}
    >
      <div
        style={{
          fontSize: 7.5,
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
          marginTop: 2,
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

function TicketRow({ ticket }: { ticket: TicketBrief }) {
  const approved = ticket.status === 'invoiced';
  const statusColor = approved ? '#1f8a4c' : '#d8442f';
  const statusLabel = approved ? 'Approved' : 'Pending';
  return (
    <tr>
      <ReportTd mono>{ticket.ticket_number}</ReportTd>
      <ReportTd>{formatTicketDate(ticket.ticket_date)}</ReportTd>
      <ReportTd>
        <span
          style={{
            border: `1px solid ${statusColor}`,
            color: statusColor,
            padding: '1px 5px',
            borderRadius: 3,
            fontSize: 9,
            fontWeight: 500,
          }}
        >
          {statusLabel}
        </span>
      </ReportTd>
      <ReportTd right mono>
        {formatMoney(ticket.face_value)}
      </ReportTd>
    </tr>
  );
}

function ReportTh({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      style={{
        textAlign: right ? 'right' : 'left',
        fontSize: 8,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: '#555',
        fontWeight: 600,
        padding: '5px 12px',
        background: '#fafafa',
        borderBottom: '1px solid #ccc',
      }}
    >
      {children}
    </th>
  );
}

function ReportTd({
  children,
  right,
  mono,
}: {
  children: React.ReactNode;
  right?: boolean;
  mono?: boolean;
}) {
  return (
    <td
      style={{
        textAlign: right ? 'right' : 'left',
        padding: '4px 12px',
        borderBottom: '1px solid #eee',
        fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
        fontVariantNumeric: mono || right ? 'tabular-nums' : 'normal',
      }}
    >
      {children}
    </td>
  );
}
