export function ReadingLegend() {
  return (
    <div className="rounded-lg bg-white border border-black/10 p-5 text-sm text-enbridge-black/75">
      <h3 className="font-semibold text-enbridge-black tracking-tight">Reading this table</h3>
      <ul className="mt-3 space-y-1.5 list-disc pl-5">
        <li>
          <strong>Committed</strong> is the dollar value of the PO as cut. All amounts are pre-tax
          (GST excluded).
        </li>
        <li>
          <strong>LEM-to-Date</strong> is the sum of all field tickets logged in this portal for the PO.
          Invoiced amounts are tracked in a separate AP system and are not shown here.
        </li>
        <li>
          <strong>Remaining</strong> = Committed − LEM-to-Date.{' '}
          <strong>% Used</strong> = LEM-to-Date / Committed.
        </li>
        <li>
          <strong>% Used</strong> shades{' '}
          <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-medium">
            amber over 80%
          </span>{' '}
          and{' '}
          <span className="inline-block px-1.5 py-0.5 rounded bg-red-100 text-red-900 font-medium">
            red over 100%
          </span>
          .
        </li>
        <li>Only POs with at least one logged ticket appear here.</li>
      </ul>
    </div>
  );
}
