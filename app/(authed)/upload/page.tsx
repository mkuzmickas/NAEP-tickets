import { UploadFlow } from '@/components/upload/UploadFlow';

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Upload Tickets</h1>
        <p className="text-sm text-enbridge-black/60">
          Drop one or more ticket PDFs. Each is parsed with Claude, reconciled to the printed total, checked for duplicates, then committed on confirmation.
        </p>
      </header>
      <UploadFlow />
    </div>
  );
}
