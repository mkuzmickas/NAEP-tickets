export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto bg-[var(--page-bg)]">
      <div className="max-w-[1400px] w-full mx-auto px-6 py-6">
        {children}
      </div>
    </div>
  );
}
