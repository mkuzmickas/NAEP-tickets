import Link from 'next/link';

export function DropZone() {
  return (
    <Link
      href="/upload"
      className="block rounded-lg border-2 border-dashed border-enbridge-yellow bg-white hover:bg-enbridge-paper transition-colors p-10 text-center"
    >
      <div className="text-base font-medium text-enbridge-black">
        Click to add or drag and drop tickets
      </div>
      <div className="mt-1 text-xs text-enbridge-black/55">
        PDF only · multiple files supported
      </div>
    </Link>
  );
}
