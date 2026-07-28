'use client';

import { useMemo } from 'react';
import { formatMoney } from '@/lib/money';
import type { MapPo, MapTicket, TicketMapData } from '@/lib/ticketMap';

// Bordered chips + tables survive greyscale; backgrounds get stripped by many
// browsers on print, so nothing critical is background-only. All colours are
// hardcoded hex — no CSS vars — so dark mode can't leak in.

const REPORT_TITLE = 'Unapproved Tickets — Value at Risk';
const PROJECT_LINE =
  'Aitken Creek Expansion Project · Enbridge Gas Inc. · Project 30006386';
const FOOTER_LINE = "Source: client Aimsio “Office Approval Status” export.";

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

export function PrintUnapproved({ data }: { data: TicketMapData }) {
  const generated = useMemo(() => formatReportDate(new Date()), []);

  // POs with at-risk value, largest first. Only the not-approved tickets
  // survive the filter — approved rows never appear in this report.
  const posByRisk = useMemo(() => {
    return data.pos
      .map((p) => ({
        po: p,
        tickets: p.tickets.filter((t) => !t.approved),
      }))
      .filter((x) => x.tickets.length > 0)
      .sort((a, b) => b.po.value_at_risk - a.po.value_at_risk);
  }, [data.pos]);

  return (
    <div className="print-only" aria-hidden="true">
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, lineHeight: 1.4 }}>
        <ReportHeader
          generated={generated}
          notApproved={data.totals.not_approved}
          valueAtRisk={data.totals.value_at_risk}
        />

        {posByRisk.length === 0 ? (
          <div
            style={{
              marginTop: 24,
              padding: 20,
              border: '1px solid #ccc',
              textAlign: 'center',
              fontStyle: 'italic',
            }}
          >
            Every ticket on file is Approved by Client/PM. Nothing at risk.
          </div>
        ) : (
          posByRisk.map(({ po, tickets }) => (
            <PoReportSection key={po.id} po={po} tickets={tickets} />
          ))
        )}

        <TotalRow value={data.totals.value_at_risk} />

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
  generated,
  notApproved,
  valueAtRisk,
}: {
  generated: string;
  notApproved: number;
  valueAtRisk: number;
}) {
  return (
    <header
      style={{
        borderBottom: '2px solid #d04e00',
        paddingBottom: 12,
        marginBottom: 16,
      }}
    >
      <h1
        style={{
          fontSize: 20,
          fontWeight: 700,
          margin: 0,
          letterSpacing: '-0.01em',
        }}
      >
        {REPORT_TITLE}
      </h1>
      <p style={{ margin: '4px 0 0', fontSize: 10, color: '#555' }}>
        {PROJECT_LINE}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: 10, color: '#555' }}>
        Generated {generated}
      </p>

      <div
        style={{
          marginTop: 12,
          display: 'flex',
          gap: 32,
          paddingTop: 8,
        }}
      >
        <SummaryStat label="Tickets not yet approved" value={String(notApproved)} />
        <SummaryStat
          label="Total value at risk"
          value={formatMoney(valueAtRisk)}
          emphasise
        />
      </div>
    </header>
  );
}

function SummaryStat({
  label,
  value,
  emphasise,
}: {
  label: string;
  value: string;
  emphasise?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#666',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: emphasise ? 20 : 16,
          fontWeight: 700,
          marginTop: 2,
          color: emphasise ? '#d8442f' : '#131417',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function PoReportSection({
  po,
  tickets,
}: {
  po: MapPo;
  tickets: MapTicket[];
}) {
  return (
    <section className="print-po-section" style={{ marginTop: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderBottom: '1.5px solid #131417',
          paddingBottom: 4,
          marginBottom: 6,
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
          {po.scope && (
            <span style={{ fontSize: 11, color: '#333' }}>
              {'  —  '}
              {po.scope}
            </span>
          )}
          {po.job_number && (
            <span
              style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 10,
                color: '#666',
                marginLeft: 8,
              }}
            >
              · job {po.job_number}
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
          {tickets.length} ticket{tickets.length === 1 ? '' : 's'} · {' '}
          <span style={{ color: '#d8442f', fontWeight: 600 }}>
            {formatMoney(po.value_at_risk)} at risk
          </span>
        </div>
      </div>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 10,
        }}
      >
        <thead>
          <tr>
            <ReportTh>Ticket</ReportTh>
            <ReportTh>Date</ReportTh>
            <ReportTh>Approval status</ReportTh>
            <ReportTh right>Billable</ReportTh>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <ReportTd mono>{t.ticket_number}</ReportTd>
              <ReportTd>{formatTicketDate(t.ticket_date)}</ReportTd>
              <ReportTd>
                {t.approval_status ? (
                  <span
                    style={{
                      border: '1px solid #d8442f',
                      color: '#d8442f',
                      padding: '1px 5px',
                      borderRadius: 3,
                      fontSize: 9,
                      fontWeight: 500,
                    }}
                  >
                    {t.approval_status}
                  </span>
                ) : (
                  <span
                    style={{ fontStyle: 'italic', color: '#666', fontSize: 9 }}
                  >
                    no approval record
                  </span>
                )}
              </ReportTd>
              <ReportTd right mono>
                {formatMoney(t.face_value)}
              </ReportTd>
            </tr>
          ))}
          <tr>
            <td
              colSpan={3}
              style={{
                paddingTop: 5,
                textAlign: 'right',
                fontWeight: 600,
                fontSize: 10,
              }}
            >
              Subtotal
            </td>
            <td
              style={{
                paddingTop: 5,
                textAlign: 'right',
                fontWeight: 700,
                fontFamily: 'ui-monospace, monospace',
                fontVariantNumeric: 'tabular-nums',
                color: '#d8442f',
                borderTop: '1px solid #aaa',
              }}
            >
              {formatMoney(po.value_at_risk)}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
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
        padding: '4px 6px',
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
        padding: '3px 6px',
        borderBottom: '1px solid #eee',
        fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
        fontVariantNumeric: mono || right ? 'tabular-nums' : 'normal',
      }}
    >
      {children}
    </td>
  );
}

function TotalRow({ value }: { value: number }) {
  return (
    <div
      style={{
        marginTop: 20,
        padding: '10px 12px',
        borderTop: '2px solid #131417',
        borderBottom: '2px solid #131417',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Total value at risk
      </span>
      <span
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#d8442f',
          fontFamily: 'ui-monospace, monospace',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatMoney(value)}
      </span>
    </div>
  );
}
