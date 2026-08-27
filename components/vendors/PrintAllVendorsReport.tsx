'use client';

import { useMemo } from 'react';
import { formatMoney } from '@/lib/money';
import type { PoWithTickets, VendorSummary } from '@/lib/vendors';

/**
 * Portfolio-wide vendor summary intended for cross-referencing with Supply
 * Chain. One row per vendor with an indented sub-row per PO underneath.
 * Same print/greyscale palette as PrintVendorReport so the two reports feel
 * like siblings in a binder.
 */

const AMBER = '#f5b119';
const AMBER_700 = '#a86f00';
const INK = '#0b0b0c';
const INK_MUTED = '#5b616b';
const RULE = '#d4d4d8';
const RULE_SOFT = '#ececee';
const SURFACE_2 = '#f7f7f8';

function formatReportDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PrintAllVendorsReport({
  vendors,
}: {
  vendors: VendorSummary[];
}) {
  const generated = useMemo(() => formatReportDate(new Date()), []);
  const totals = useMemo(
    () => ({
      committed: vendors.reduce((s, v) => s + v.total_committed, 0),
      lem: vendors.reduce((s, v) => s + v.total_lem, 0),
      forecast: vendors.reduce((s, v) => s + v.total_forecast, 0),
      poCount: vendors.reduce((s, v) => s + v.po_count, 0),
    }),
    [vendors]
  );
  const grandDelta = totals.forecast - totals.committed;

  return (
    <div className="print-only vendor-portfolio-print-report" aria-hidden="true">
      <div
        style={{
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          fontSize: 9.5,
          lineHeight: 1.4,
          color: INK,
          paddingTop: 18,
        }}
      >
        <ReportHeader
          generated={generated}
          vendorCount={vendors.length}
          poCount={totals.poCount}
        />

        <SummaryBar
          totalCommitted={totals.committed}
          totalLem={totals.lem}
          totalForecast={totals.forecast}
          grandDelta={grandDelta}
          vendorCount={vendors.length}
          poCount={totals.poCount}
        />

        <div style={{ marginTop: 14 }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 9.5,
            }}
          >
            <thead>
              <tr>
                <Th align="left" width="30%">Vendor / PO</Th>
                <Th align="left" width="24%">Scope</Th>
                <Th align="right">Committed</Th>
                <Th align="right">LEM-to-Date</Th>
                <Th align="right">Forecast</Th>
                <Th align="right" width="9%">% Used</Th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 20,
                      textAlign: 'center',
                      fontStyle: 'italic',
                      color: INK_MUTED,
                      border: `1px solid ${RULE_SOFT}`,
                    }}
                  >
                    No vendors on file.
                  </td>
                </tr>
              ) : (
                vendors.map((v) => <VendorBlock key={v.slug} vendor={v} />)
              )}
              {vendors.length > 0 && (
                <tr>
                  <td
                    colSpan={2}
                    style={{
                      padding: '8px 8px 8px 8px',
                      borderTop: `2px solid ${INK}`,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontSize: 9,
                    }}
                  >
                    Portfolio Total · {vendors.length} vendors · {totals.poCount} POs
                  </td>
                  <TotalCell value={totals.committed} />
                  <TotalCell value={totals.lem} />
                  <TotalCell value={totals.forecast} />
                  <td
                    style={{
                      padding: '8px 8px',
                      borderTop: `2px solid ${INK}`,
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 700,
                    }}
                  >
                    {totals.committed > 0
                      ? `${((totals.lem / totals.committed) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ReportFooter generated={generated} />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// One vendor row + its PO sub-rows
// -----------------------------------------------------------------------------
function VendorBlock({ vendor }: { vendor: VendorSummary }) {
  const pctUsed =
    vendor.total_committed > 0
      ? (vendor.total_lem / vendor.total_committed) * 100
      : 0;

  return (
    <>
      {/* Vendor summary row — bold, tinted background, no scope in first cell */}
      <tr style={{ background: SURFACE_2, breakInside: 'avoid' }}>
        <td
          style={{
            padding: '7px 8px 6px',
            fontWeight: 700,
            fontSize: 10.5,
            borderTop: `1px solid ${RULE}`,
          }}
        >
          {vendor.vendor_display_name}
          <div
            style={{
              fontWeight: 400,
              fontSize: 8.5,
              color: INK_MUTED,
              marginTop: 1,
            }}
          >
            {vendor.vendor_legal_name} · {vendor.po_count} PO
            {vendor.po_count === 1 ? '' : 's'}
          </div>
        </td>
        <td
          style={{
            padding: '7px 8px 6px',
            borderTop: `1px solid ${RULE}`,
            color: INK_MUTED,
            fontSize: 9,
          }}
        >
          —
        </td>
        <MoneyCell value={vendor.total_committed} bold top />
        <MoneyCell value={vendor.total_lem} bold top />
        <MoneyCell value={vendor.total_forecast} bold top />
        <td
          style={{
            padding: '7px 8px 6px',
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 700,
            borderTop: `1px solid ${RULE}`,
          }}
        >
          {vendor.total_committed > 0 ? `${pctUsed.toFixed(1)}%` : '—'}
        </td>
      </tr>

      {/* PO sub-rows (only render when >1 PO or when scope adds signal) */}
      {vendor.pos.map((po) => (
        <PoSubRow key={po.id} po={po} />
      ))}
    </>
  );
}

function PoSubRow({ po }: { po: PoWithTickets }) {
  const pctUsed = po.committed > 0 ? (po.lem / po.committed) * 100 : 0;
  return (
    <tr style={{ breakInside: 'avoid' }}>
      <td
        style={{
          padding: '4px 8px 4px 22px',
          fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
          fontSize: 9,
          borderTop: `1px solid ${RULE_SOFT}`,
          color: INK,
        }}
      >
        {po.po_number}
        {po.project_cost_code && (
          <span style={{ color: INK_MUTED, marginLeft: 6, fontSize: 8.5 }}>
            {po.project_cost_code}
          </span>
        )}
      </td>
      <td
        style={{
          padding: '4px 8px',
          borderTop: `1px solid ${RULE_SOFT}`,
          color: INK_MUTED,
          fontSize: 9,
        }}
      >
        {po.scope ?? '—'}
      </td>
      <MoneyCell value={po.committed} />
      <MoneyCell value={po.lem} />
      <MoneyCell value={po.forecast ?? po.committed} muted={po.forecast == null} />
      <td
        style={{
          padding: '4px 8px',
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          fontSize: 9,
          borderTop: `1px solid ${RULE_SOFT}`,
          color: pctUsed > 100 ? '#d8442f' : INK_MUTED,
        }}
      >
        {po.committed > 0 ? `${pctUsed.toFixed(1)}%` : '—'}
      </td>
    </tr>
  );
}

function MoneyCell({
  value,
  bold,
  top,
  muted,
}: {
  value: number;
  bold?: boolean;
  top?: boolean;
  muted?: boolean;
}) {
  return (
    <td
      style={{
        padding: top ? '7px 8px 6px' : '4px 8px',
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: bold ? 700 : 400,
        borderTop: top ? `1px solid ${RULE}` : `1px solid ${RULE_SOFT}`,
        color: muted ? INK_MUTED : INK,
        fontSize: bold ? 10 : 9.5,
      }}
    >
      {formatMoney(value)}
    </td>
  );
}

function TotalCell({ value }: { value: number }) {
  return (
    <td
      style={{
        padding: '8px 8px',
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 700,
        borderTop: `2px solid ${INK}`,
      }}
    >
      {formatMoney(value)}
    </td>
  );
}

function Th({
  children,
  align,
  width,
}: {
  children: React.ReactNode;
  align: 'left' | 'right';
  width?: string;
}) {
  return (
    <th
      style={{
        padding: '6px 8px',
        textAlign: align,
        borderBottom: `1.5px solid ${INK}`,
        fontSize: 8,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 700,
        color: INK,
        width,
      }}
    >
      {children}
    </th>
  );
}

// -----------------------------------------------------------------------------
// Header + summary bar + footer
// -----------------------------------------------------------------------------
function ReportHeader({
  generated,
  vendorCount,
  poCount,
}: {
  generated: string;
  vendorCount: number;
  poCount: number;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
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

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 24,
          borderBottom: `2px solid ${AMBER}`,
          paddingBottom: 10,
        }}
      >
        <div>
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
            Vendor Portfolio · Supply Chain Cross-Reference
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: INK,
            }}
          >
            All Vendors Snapshot
          </h1>
          <p
            style={{
              margin: '5px 0 0',
              fontSize: 9.5,
              color: INK_MUTED,
              fontWeight: 500,
            }}
          >
            {vendorCount} vendor{vendorCount === 1 ? '' : 's'} · {poCount} PO
            {poCount === 1 ? '' : 's'} on file
          </p>
        </div>
        <div
          style={{
            textAlign: 'right',
            fontSize: 9,
            color: INK_MUTED,
            lineHeight: 1.6,
          }}
        >
          <div>
            <span style={{ fontWeight: 700, color: INK }}>Generated</span>{' '}
            {generated}
          </div>
          <div>Project 30006386</div>
        </div>
      </div>
    </div>
  );
}

function SummaryBar({
  totalCommitted,
  totalLem,
  totalForecast,
  grandDelta,
  vendorCount,
  poCount,
}: {
  totalCommitted: number;
  totalLem: number;
  totalForecast: number;
  grandDelta: number;
  vendorCount: number;
  poCount: number;
}) {
  const deltaColor =
    grandDelta > 0.5 ? '#d8442f' : grandDelta < -0.5 ? '#1f8a4c' : INK_MUTED;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10,
        marginTop: 10,
      }}
    >
      <Stat label="Portfolio Committed" value={formatMoney(totalCommitted)} sub={`${vendorCount} vendors · ${poCount} POs`} />
      <Stat label="LEM-to-Date" value={formatMoney(totalLem)} sub={totalCommitted > 0 ? `${((totalLem / totalCommitted) * 100).toFixed(1)}% of committed` : '—'} />
      <Stat label="Forecast at Completion" value={formatMoney(totalForecast)} sub={`${grandDelta >= 0 ? '+' : ''}${formatMoney(grandDelta)} vs committed`} subColor={deltaColor} />
      <Stat label="Report Purpose" value="Supply Chain X-Ref" sub="Values match live tracker at moment of print." small />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  subColor,
  small,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  small?: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${RULE}`,
        borderRadius: 3,
        padding: '8px 10px',
      }}
    >
      <div
        style={{
          fontSize: 7.5,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 700,
          color: INK_MUTED,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: small ? 12 : 15,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
          color: INK,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            marginTop: 2,
            fontSize: 8.5,
            color: subColor ?? INK_MUTED,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function ReportFooter({ generated }: { generated: string }) {
  return (
    <div
      style={{
        marginTop: 18,
        paddingTop: 10,
        borderTop: `1px solid ${RULE_SOFT}`,
        fontSize: 8,
        color: INK_MUTED,
        display: 'flex',
        justifyContent: 'space-between',
      }}
    >
      <span>
        NAEP Field Cost Tracker · Values reflect data at moment of print.
      </span>
      <span>Generated {generated}</span>
    </div>
  );
}
